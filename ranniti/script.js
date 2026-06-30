// ==========================================================================
// 1. GLOBAL STATE & INITIALIZATION
// ==========================================================================
let usersDB = JSON.parse(localStorage.getItem("ranniti_users_master")) || [];
let currentUser = JSON.parse(localStorage.getItem("ranniti_active_user")) || null;
let questionsDB = JSON.parse(localStorage.getItem("ranniti_exam_db")) || [];
let libraryDB = JSON.parse(localStorage.getItem("ranniti_library_db")) || [];
let jobsDB = JSON.parse(localStorage.getItem("ranniti_jobs_db")) || [];
let completedTopics = new Set(JSON.parse(localStorage.getItem("ranniti_done_topics")) || []);
let advStats = JSON.parse(localStorage.getItem("ranniti_analytics")) || { totalAttempts: 0, totalCorrect: 0 };
let currentStudyMedium = "Bilingual";
let silentTimerInterval;

// DYNAMIC ICONS ARRAYS
const CH_ICONS = ['📊', '🧠', '💡', '🚀', '🎯', '⏳', '🧭', '⚙️', '🔍', '📈', '🏆', '🎖️', '💎', '🔥', '🌟', '📚', '📝', '🔬', '🔭', '💻', '📈', '✨', '⚡', '📐', '📏', '📅', '📉'];
const ST_ICONS = ['🎯', '⚡', '💡', '🚀', '🔥', '🌟', '💎', '✨', '📝', '📌', '🧠', '🧩'];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    let si = document.getElementById('searchInput');
    if(si) {
        si.addEventListener('input', e => { 
            searchVal = e.target.value.toLowerCase(); 
            renderTrackerCards(); 
        });
    }

    if(localStorage.getItem('ranniti_calendar_off') === 'true') {
        let calTog = document.getElementById('calendarToggle');
        if(calTog) calTog.checked = false;
        let pCard = document.getElementById('mc-planner');
        if(pCard) pCard.style.display = 'none';
    }
});

// ==========================================================================
// 2. BACKGROUND SILENT STUDY TIMER 
// ==========================================================================
function startSilentTimer() {
    clearInterval(silentTimerInterval);
    if(!currentUser || currentUser.role === 'guest' || currentUser.role === 'admin') return;
    
    currentUser.studyTime = currentUser.studyTime || 0;
    
    silentTimerInterval = setInterval(() => {
        currentUser.studyTime++;
        let timeDisplay = document.getElementById('profStudyTime');
        if(timeDisplay) {
            let m = Math.floor(currentUser.studyTime / 60);
            timeDisplay.innerHTML = `<i class="fa-solid fa-stopwatch"></i> Today's Study: ${m}m`;
        }

        if(currentUser.studyTime % 10 === 0) {
            localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
            let idx = usersDB.findIndex(u => u.email === currentUser.email);
            if(idx > -1) {
                usersDB[idx] = currentUser;
                localStorage.setItem("ranniti_users_master", JSON.stringify(usersDB));
            }
        }
    }, 1000);
}

// ==========================================================================
// 3. AUTHENTICATION, PINCODE API, & PROFILE EDITING
// ==========================================================================
function capitalizeName(input) {
    if(!input.value) return;
    input.value = input.value.charAt(0).toUpperCase() + input.value.slice(1);
}

async function fetchLocationByPincode(pin, targetId) {
    let locInput = document.getElementById(targetId);
    if(!locInput) return;
    if(pin.length === 6) {
        locInput.value = "Fetching data...";
        try {
            let res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            let data = await res.json();
            if(data[0].Status === "Success") {
                locInput.value = `${data[0].PostOffice[0].District}, ${data[0].PostOffice[0].State}`;
            } else { locInput.value = "Invalid Pincode"; }
        } catch(e) { locInput.value = "Network Error"; }
    } else { locInput.value = ""; }
}

function toggleAuthMode() {
    let l = document.getElementById('loginCard'), r = document.getElementById('registerCard');
    if(l.style.display === 'none') { l.style.display = 'block'; r.style.display = 'none'; }
    else { l.style.display = 'none'; r.style.display = 'block'; }
}

function skipToGuest() {
    currentUser = { 
        firstName: "Guest", lastName: "", role: "guest", designation: "Exploring Ranniti", 
        qualification: "N/A", pursuing: "N/A", location: "N/A", timeline: "N/A",
        gender: "N/A", dob: "N/A", phone: "N/A", email: "guest@ranniti.com", diploma: "N/A",
        studyTime: 0, appliedForms: [], medium: "Bilingual", profilePic: null
    };
    checkAuth();
}
function adminDirectLogin() {
    let choice = prompt("एडमिन मेनू:\n👉 लॉगिन करने के लिए '1' टाइप करें\n👉 नया एडमिन अकाउंट बनाने के लिए '2' टाइप करें");

    if (choice === '2') {
        let email = prompt("नया Admin Email डालें:");
        let pass = prompt("नया Password डालें (कम से कम 6 अक्षर):");
        
        auth.createUserWithEmailAndPassword(email, pass)
        .then(() => alert("✅ अकाउंट बन गया! अब आप '1' दबाकर लॉगिन कर सकते हैं।"))
        .catch(e => alert("❌ एरर: " + e.message));
    }
    else if (choice === '1') {
        let email = prompt("📧 Admin Email डालें:");
        let pass = prompt("🔑 Password डालें:");
        
        auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            alert("🔓 वेलकम बॉस! एडमिन पैनल खुल रहा है...");
            currentUser = { firstName: "Master Admin", lastName: "", email: email, role: "admin" };
            localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
            checkAuth();
        })
        .catch(e => alert("❌ गलत ईमेल या पासवर्ड!"));
    }
}

function loginUser() {
    let email = document.getElementById("loginEmail").value.trim();
    let pass = document.getElementById("loginPassword").value;

    if (!email || !pass) {
        alert("⚠️ Please enter Email and Password!");
        return;
    }

    // ==========================================
    // 👑 1. ADMIN LOGIN
    // ==========================================
    if (email === "mohanthak164@gmail.com") {
        auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            alert("🔓 Welcome Boss! Admin Panel is opening...");
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('nav-admin').style.display = 'inline-block'; 
            switchTab('admin'); 
            currentUser = { firstName: "Master Admin", email: email, role: "admin" };
            localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        })
        .catch((error) => alert("❌ Error: " + error.message));        
        return; 
    }

    // ==========================================
    // 🎓 2. STUDENT LOGIN
    // ==========================================
    auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        alert("✅ Login Successful!");
        document.getElementById('authOverlay').style.display = 'none';
        
        // डेटाबेस से बच्चे का पुराना डेटा (नाम, फोटो आदि) वापस लाना
        let existingUser = usersDB.find(u => u.email === email);
        if(existingUser) {
            currentUser = existingUser;
        } else {
            currentUser = { email: email, role: "student", firstName: "Student", studyTime: 0 }; 
        }
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        checkAuth(); // प्रोफाइल को रिफ्रेश करेगा
        switchTab('home');
    })
    .catch((error) => {
        alert("❌ Error: Invalid Email or Password!");
    });
}

function logoutUser() {
    if(!confirm("Are you sure you want to log out?")) return;
    clearInterval(silentTimerInterval);
    localStorage.removeItem("ranniti_active_user");
    currentUser = null;
    checkAuth();
}

function uploadProfilePic(event) {
    if(!currentUser || currentUser.role === 'guest') { alert("Please register to upload photo."); return; }
    let file = event.target.files[0];
    if(file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            currentUser.profilePic = e.target.result;
            localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
            checkAuth(); 
        };
        reader.readAsDataURL(file);
    }
}

function openEditProfile() {
    if(!currentUser || currentUser.role === 'guest') { alert("Guests cannot edit profile. Please register."); return; }
    document.getElementById('editProfileOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    document.getElementById('editFirstName').value = currentUser.firstName || "";
    document.getElementById('editLastName').value = currentUser.lastName || "";
    document.getElementById('editGender').value = currentUser.gender || "Male";
    document.getElementById('editDob').value = currentUser.dob || "";
    document.getElementById('editQualification').value = currentUser.qualification || "12th Pass";
    document.getElementById('editPursuing').value = currentUser.pursuing || "None";
    document.getElementById('editDiploma').value = currentUser.diploma || "";
    document.getElementById('editLocation').value = currentUser.location || "";
    document.getElementById('editTimeline').value = currentUser.timeline || "1 Year";
    document.getElementById('editDesignation').value = currentUser.designation || "";
    document.getElementById('editPhone').value = currentUser.phone || "";
}

function closeEditProfile() {
    document.getElementById('editProfileOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function saveUpdatedProfile() {
    currentUser.firstName = document.getElementById('editFirstName').value.trim();
    currentUser.lastName = document.getElementById('editLastName').value.trim();
    currentUser.gender = document.getElementById('editGender').value;
    currentUser.dob = document.getElementById('editDob').value;
    currentUser.qualification = document.getElementById('editQualification').value;
    currentUser.pursuing = document.getElementById('editPursuing').value;
    currentUser.diploma = document.getElementById('editDiploma').value.trim();
    if(document.getElementById('editLocation').value !== "Fetching data...") {
        currentUser.location = document.getElementById('editLocation').value;
    }
    currentUser.timeline = document.getElementById('editTimeline').value;
    currentUser.designation = document.getElementById('editDesignation').value.trim();
    currentUser.phone = document.getElementById('editPhone').value.trim();
    
    localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
    let idx = usersDB.findIndex(u => u.email === currentUser.email);
    if(idx > -1) {
        usersDB[idx] = currentUser;
        localStorage.setItem("ranniti_users_master", JSON.stringify(usersDB));
    }
    
    alert("Profile updated successfully!");
    closeEditProfile();
    checkAuth();
}

function checkAuth() {
    let overlay = document.getElementById('authOverlay');
    if(currentUser) {
        if(overlay) overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        let fullName = currentUser.firstName + (currentUser.lastName ? " " + currentUser.lastName : "");
        let desig = currentUser.designation || "Exploring Ranniti";
        let initial = currentUser.firstName.charAt(0).toUpperCase();
        
        let navAvatar = document.getElementById('displayUserAvatar');
        let profAvatar = document.getElementById('profAvatar');
        
        if(currentUser.profilePic) {
            let imgHTML = `<img src="${currentUser.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            if(navAvatar) navAvatar.innerHTML = imgHTML;
            if(profAvatar) profAvatar.innerHTML = imgHTML;
        } else {
            if(navAvatar) navAvatar.innerHTML = initial;
            if(profAvatar) profAvatar.innerHTML = initial;
        }
        
        let dUser = document.getElementById('displayUserName');
        let dDesig = document.getElementById('displayUserDesig');
        if(dUser) dUser.innerText = currentUser.firstName;
        if(dDesig) dDesig.innerText = desig;
        
        let pUser = document.getElementById('profFullName');
        let pDesig = document.getElementById('profDesignation');
        let pQual = document.getElementById('profQual');
        let pPurs = document.getElementById('profPursuing');
        let pLoc = document.getElementById('profLocation');
        let pTime = document.getElementById('profTimeline');
        let pEmail = document.getElementById('profEmail');
        let pPhone = document.getElementById('profPhone');
        let pGender = document.getElementById('profGender');
        let pDob = document.getElementById('profDob');
        let pDip = document.getElementById('profDiploma');

        if(pUser) pUser.innerText = fullName;
        if(pDesig) pDesig.innerText = desig;
        if(pQual) pQual.innerText = currentUser.qualification || "N/A";
        if(pPurs) pPurs.innerText = currentUser.pursuing || "N/A";
        if(pLoc) pLoc.innerText = currentUser.location || "N/A";
        if(pTime) pTime.innerText = currentUser.timeline || "N/A";
        if(pEmail) pEmail.innerText = currentUser.email || "N/A";
        if(pPhone) pPhone.innerText = currentUser.phone || "N/A";
        if(pGender) pGender.innerText = currentUser.gender || "N/A";
        if(pDob) pDob.innerText = currentUser.dob || "N/A";
        if(pDip) pDip.innerText = currentUser.diploma || "N/A";

        let gMedList = document.querySelectorAll('.medium-selector');
        gMedList.forEach(el => { if(currentUser.medium) el.value = currentUser.medium; });
        currentStudyMedium = currentUser.medium || "Bilingual";
        
        if(currentUser.role === 'admin') {
            let nAdmin = document.getElementById('nav-admin');
            if(nAdmin) nAdmin.style.display = 'block';
            switchTab('admin'); 
            // Trigger Admin Dropdown logic initially
            updateAdminTopics();
            renderAdminQuestions();
        } else {
            let nAdmin = document.getElementById('nav-admin');
            if(nAdmin) nAdmin.style.display = 'none';
            switchTab('home'); openModule('book'); startSilentTimer();
        }
        
        if(localStorage.getItem('ranniti_darkmode') === 'true') {
            document.body.classList.add('dark-mode');
            let dm = document.getElementById('darkModeToggle');
            if(dm) dm.checked = true;
        }
    } else {
        if(overlay) overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        clearInterval(silentTimerInterval);
    }
}

// ==========================================================================
// 4. SETTINGS & APP CONTROL
// ==========================================================================
function toggleDarkMode() {
    let dmToggle = document.getElementById('darkModeToggle');
    document.body.classList.toggle('dark-mode', dmToggle.checked);
    localStorage.setItem('ranniti_darkmode', dmToggle.checked);
}

function toggleCalendar() {
    let calTog = document.getElementById('calendarToggle');
    let pCard = document.getElementById('mc-planner');
    if(!calTog.checked) {
        if(pCard) pCard.style.display = 'none';
        localStorage.setItem('ranniti_calendar_off', 'true');
    } else {
        if(pCard) pCard.style.display = 'block';
        localStorage.setItem('ranniti_calendar_off', 'false');
    }
}

function changeGlobalMedium() {
    let selected = event.target.value;
    currentStudyMedium = selected;
    document.querySelectorAll('.medium-selector').forEach(el => el.value = selected);
    if(currentUser && currentUser.role !== 'guest') {
        currentUser.medium = selected;
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
    }
}

// ==========================================================================
// 5. NAVIGATION MODULE
// ==========================================================================
function switchTab(tabId) {
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active-link'));
    let p = document.getElementById(tabId + 'Panel'); if(p) p.classList.add('active-panel');
    let l = document.getElementById('nav-' + tabId); if(l) l.classList.add('active-link');
    
    if(tabId === 'home') { openModule('book'); switchTrackerSubj(currSub); }
    if(tabId === 'jobs') renderJobs();
    if(tabId === 'material') renderLibrary();
}

function openModule(modId) {
    document.querySelectorAll('.main-card').forEach(c => c.classList.remove('active-card'));
    let c = document.getElementById('mc-' + modId); if(c) c.classList.add('active-card');
    document.querySelectorAll('.dash-module').forEach(m => m.style.display = 'none');
    let m = document.getElementById('module-' + modId); if(m) m.style.display = 'block';

    if(modId === 'analytics') updateAnalyticsUI();
    if(modId === 'planner') generateDailyPlan();
    if(modId === 'book') switchTrackerSubj(currSub);
}

function switchLibraryTab(tab) {
    document.querySelectorAll('#materialPanel .t-tab').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.lib-content').forEach(c => c.style.display = 'none');
    let lc = document.getElementById('lib-' + tab); if(lc) lc.style.display = 'block';
    renderLibrary();
}

function switchJobsTab(tab) {
    document.querySelectorAll('#jobsPanel .t-tab').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.jobs-content').forEach(c => c.style.display = 'none');
    let jc = document.getElementById('jobs-' + tab); if(jc) jc.style.display = 'block';
}

// ==========================================================================
// 6. 93 CHAPTERS MASTER DATABASE 
// ==========================================================================
const subData = {
    Math: {
        color: "math",
        chs: [
            {id:1, name:"Number System", types:["Unit Digit & Face Value", "Divisibility Rules", "Remainder Theorem", "Number of Zeros", "Factors & Multiples"]},
            {id:2, name:"LCM & HCF", types:["Basic Concepts", "Fractions LCM/HCF", "Polynomials", "Word Problems"]},
            {id:3, name:"Simplification & Surds", types:["BODMAS Rule", "Square & Cube Roots", "Surds & Indices", "Rationalization"]},
            {id:4, name:"Fractions & Decimals", types:["Types of Fractions", "Recurring Decimals", "Comparison of Fractions"]},
            {id:5, name:"Percentage", types:["Fraction to % Conversions", "Successive Change", "Population", "Elections", "Income & Tax"]},
            {id:6, name:"Profit, Loss & Discount", types:["Basic P&L", "Dishonest Shopkeeper", "Marked Price", "Successive Discount"]},
            {id:7, name:"Simple Interest", types:["Basic SI", "Installments in SI", "Rate and Time relations"]},
            {id:8, name:"Compound Interest", types:["Basic CI", "Difference between SI & CI", "Installments in CI", "Tree Method"]},
            {id:9, name:"Ratio & Proportion", types:["Basic Ratios", "Coins & Distribution", "Incomes & Savings", "Proportions"]},
            {id:10, name:"Mixture & Allegation", types:["Basic Mixture", "Replacement of Quantity", "Multiple Mixtures", "Allegation Method"]},
            {id:11, name:"Partnership", types:["Investment Ratio", "Time Ratio", "Working & Sleeping Partners"]},
            {id:12, name:"Average", types:["Basic Average", "Inclusion/Exclusion", "Batting/Bowling Average", "Age Problems"]},
            {id:13, name:"Time & Work", types:["LCM Method", "Efficiency Based", "Alternate Days", "Men, Women & Children"]},
            {id:14, name:"Work & Wages", types:["Wages distribution based on efficiency", "Partial completion"]},
            {id:15, name:"Pipe & Cistern", types:["Basic Filling/Emptying", "Alternate Hours", "Leakage Problems"]},
            {id:16, name:"Time, Speed & Distance", types:["Basic Concepts", "Average Speed", "Late/Early Concepts"]},
            {id:17, name:"Trains", types:["Crossing a Pole/Man", "Crossing a Platform", "Relative Speed"]},
            {id:18, name:"Boats & Streams", types:["Upstream & Downstream", "Still Water Speed", "Time Difference"]},
            {id:19, name:"Races & Games", types:["Linear Race", "Circular Track", "Head Start"]},
            {id:20, name:"Algebra", types:["Basic Identities", "Value Putting Method", "Linear Equations", "Quadratic", "Maxima & Minima"]},
            {id:21, name:"Trigonometry", types:["Ratios", "Identities", "Degree Values", "Max & Min Value"]},
            {id:22, name:"Heights & Distances", types:["Angle of Elevation", "Angle of Depression", "Shadow/Tower problems"]},
            {id:23, name:"Geometry - Lines & Angles", types:["Parallel Lines", "Transversal", "Types of Angles"]},
            {id:24, name:"Geometry - Triangles", types:["Congruence & Similarity", "Centers (Incenter, Circumcenter, Centroid, Orthocenter)"]},
            {id:25, name:"Geometry - Circles", types:["Chords & Tangents", "Cyclic Quadrilaterals", "Common Tangents"]},
            {id:26, name:"Mensuration (2D & 3D)", types:["Area & Perimeter (2D)", "Volume & Surface (3D)", "Prism & Pyramid", "Melting"]},
            {id:27, name:"Coordinate Geometry & DI", types:["Distance Formula", "Slope", "Pie Chart", "Bar Graph", "Line Graph"]}
        ] 
    },
    GK: {
        color: "gk",
        chs: [
            {id:1, name:"Ancient History", types:["Indus Valley", "Vedic Period", "Buddhism & Jainism", "Mauryan Empire", "Gupta Empire"]},
            {id:2, name:"Medieval History", types:["Delhi Sultanate", "Mughal Empire", "Bhakti Movement", "Marathas & Vijayanagara"]},
            {id:3, name:"Modern History", types:["Advent of Europeans", "Revolt of 1857", "Social Reforms", "INC", "Gandhian Era"]},
            {id:4, name:"World History", types:["French Revolution", "Russian Revolution", "World War I & II"]},
            {id:5, name:"Indian Art & Culture", types:["Folk & Classical Dances", "Festivals", "Temples & Monuments", "Paintings"]},
            {id:6, name:"Indian Polity - Basics", types:["Making of Constitution", "Preamble", "Sources of Constitution"]},
            {id:7, name:"Indian Polity - Constitution", types:["Parts & Schedules", "Fundamental Rights & DPSP", "Amendments"]},
            {id:8, name:"Indian Polity - Governance", types:["President & Parliament", "PM & Council", "Supreme & High Courts", "Panchayati Raj"]},
            {id:9, name:"Physical Geography", types:["Solar System & Earth", "Interior of Earth", "Atmosphere & Climate"]},
            {id:10, name:"World Geography", types:["Continents & Oceans", "World Rivers & Mountains", "Grasslands & Deserts"]},
            {id:11, name:"Indian Geography - Basics", types:["Physical Features of India", "Climate & Soils", "Vegetation & Forests"]},
            {id:12, name:"Indian Geography - Resources", types:["River Systems", "Agriculture & Minerals", "Transport & Ports"]},
            {id:13, name:"Indian Economy", types:["Five Year Plans", "National Income", "Poverty & Unemployment"]},
            {id:14, name:"Banking & Finance", types:["RBI & Banking System", "Budget & Taxation", "Financial Committees"]},
            {id:15, name:"Physics", types:["Units & Measurements", "Motion, Work, Energy", "Light & Sound", "Electricity"]},
            {id:16, name:"Chemistry", types:["Matter & States", "Atomic Structure", "Acids & Bases", "Metals & Non-metals", "Periodic Table"]},
            {id:17, name:"Biology - Zoology", types:["Cell Structure", "Human Body Systems", "Diseases & Nutrition"]},
            {id:18, name:"Biology - Botany", types:["Plant Kingdom", "Plant Tissue & Hormones", "Photosynthesis"]},
            {id:19, name:"Space & Defense", types:["ISRO & NASA Missions", "Missiles & Satellites", "Defense Exercises"]},
            {id:20, name:"Environment & Ecology", types:["Ecosystem", "Biodiversity", "Pollution", "National Parks"]},
            {id:21, name:"Computer & IT", types:["Hardware & Software", "Networking & Internet", "MS Office", "Keyboard Shortcuts"]},
            {id:22, name:"Static GK - Miscellaneous", types:["First in India/World", "Longest, Largest", "Important Days", "International Orgs"]},
            {id:23, name:"Sports, Books & Awards", types:["Olympics & Asian Games", "Sports Terms", "Important Books", "Nobel & Oscars"]},
            {id:24, name:"Current Affairs", types:["National News", "International News", "Appointments", "Indexes", "Govt. Schemes"]}
        ] 
    },
    English: {
        color: "eng",
        chs: [
            {id:1, name:"Noun", types:["Types of Noun", "Rules of Noun & Numbers", "Noun & Cases"]},
            {id:2, name:"Pronoun", types:["Types of Pronoun", "Relative Pronouns", "Reflexive Pronouns"]},
            {id:3, name:"Adjective", types:["Degrees of Comparison", "Rules of Adjective", "Confusing Adjectives"]},
            {id:4, name:"Adverb", types:["Types of Adverb", "Position of Adverb", "Inversion Rule"]},
            {id:5, name:"Verb", types:["Basic Verbs", "Transitive & Intransitive", "Modals"]},
            {id:6, name:"Advanced Verb", types:["Gerund", "Infinitive", "Participles"]},
            {id:7, name:"Tense", types:["Present Tense", "Past Tense", "Future Tense"]},
            {id:8, name:"Conditional Sentences", types:["Zero Conditional", "First Conditional", "Second & Third Conditional"]},
            {id:9, name:"Subject-Verb Agreement", types:["Basic Rules", "Exceptions", "Collective Nouns"]},
            {id:10, name:"Preposition", types:["Basic Prepositions", "Fixed Prepositions", "Phrasal Verbs"]},
            {id:11, name:"Conjunction", types:["Coordinating", "Subordinating", "Correlative Conjunctions"]},
            {id:12, name:"Articles", types:["Definite Article (The)", "Indefinite Articles (A/An)", "Omission of Articles"]},
            {id:13, name:"Question Tags", types:["Positive/Negative Rules", "Exceptions"]},
            {id:14, name:"Active & Passive Voice", types:["Tense Change Rules", "Imperative Sentences", "Interrogative", "Special Cases"]},
            {id:15, name:"Direct & Indirect Speech", types:["Changes in Tense & Time", "Changes in Pronoun", "Exclamatory & Optative"]},
            {id:16, name:"Synonyms & Antonyms", types:["High-Frequency Words", "Root Words based", "Contextual Meaning"]},
            {id:17, name:"One Word Substitution", types:["Phobias & Manias", "Killings & Governments", "Miscellaneous"]},
            {id:18, name:"Idioms & Phrases", types:["Animal based", "Color based", "Common Phrasal Idioms"]},
            {id:19, name:"Spelling Errors", types:["Common Rules", "Confusing Words", "Double Consonant Words"]},
            {id:20, name:"Reading Comprehension", types:["Story-based", "Economy/Tech", "Tone & Theme"]},
            {id:21, name:"Cloze Test & Para Jumbles", types:["Grammar Fillers", "Vocab Fillers", "Connecting Links (PQRS)"]}
        ] 
    },
    Reasoning: {
        color: "rea",
        chs: [
            {id:1, name:"Number Series", types:["Missing Term", "Wrong Term", "Prime/Square Logic"]},
            {id:2, name:"Alphabet Series", types:["Letter Series", "Continuous Pattern Series"]},
            {id:3, name:"Analogy", types:["Word Analogy", "Number Analogy", "Letter Analogy", "Figure Analogy"]},
            {id:4, name:"Classification (Odd One Out)", types:["Word Classification", "Number Classification", "Letter Classification", "Figure Classification"]},
            {id:5, name:"Coding-Decoding", types:["Letter Coding", "Number/Symbol Coding", "Substitution Coding", "Matrix Coding"]},
            {id:6, name:"Blood Relations", types:["Pointing/Photograph Form", "Family Tree Puzzle", "Coded Blood Relation"]},
            {id:7, name:"Direction & Distance", types:["Basic Directions", "Shadow Based Questions", "Angle Based Turns"]},
            {id:8, name:"Syllogism", types:["All / Some / No", "Possibility Cases", "Only & Only a few Concept"]},
            {id:9, name:"Venn Diagram", types:["Logical Venn Diagrams", "Data/Number Based Venn Diagrams"]},
            {id:10, name:"Clock", types:["Angle between hands", "Faulty Clocks", "Mirror Time of Clock"]},
            {id:11, name:"Calendar", types:["Odd Days & Leap Year", "Finding Day of a Date", "Repetition of Calendar"]},
            {id:12, name:"Dice", types:["Standard & General Dice", "Open Dice"]},
            {id:13, name:"Cube & Cuboid", types:["Cutting of Cubes", "Painting of Cubes"]},
            {id:14, name:"Missing Number", types:["Grid Based", "Circular Based", "Figure Based Math Operations"]},
            {id:15, name:"Mathematical Operations", types:["BODMAS Verification", "Symbol Substitution", "Interchanging Signs"]},
            {id:16, name:"Word Formation & Dictionary", types:["Logical Sequence of Words", "Dictionary Order", "Meaningful Word Formation"]},
            {id:17, name:"Seating Arrangement", types:["Linear Arrangement", "Circular Arrangement", "Square Arrangement"]},
            {id:18, name:"Puzzle", types:["Floor Based Puzzle", "Box Based Puzzle", "Day/Month Puzzle"]},
            {id:19, name:"Analytical Reasoning", types:["Statement & Conclusions", "Statement & Assumptions", "Course of Action", "Arguments"]},
            {id:20, name:"Non-Verbal: Images & Folding", types:["Mirror & Water Images", "Paper Cutting & Folding"]},
            {id:21, name:"Non-Verbal: Figures", types:["Embedded Figures", "Figure Completion", "Figure Series", "Figure Counting"]}
        ] 
    }
};

let currSub = 'Math';
let searchVal = '';
let selectedChapter = null;
let selectedTopic = null;

function switchTrackerSubj(subj) {
    currSub = subj;
    document.querySelectorAll('#module-book .t-tab').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${subData[subj].color}`);
    
    searchVal = '';
    let si = document.getElementById('searchInput');
    if(si) si.value = '';
    renderTrackerCards();
}

function renderTrackerCards() {
    let grid = document.getElementById('chaptersGrid');
    if(!grid) return; 
    grid.innerHTML = '';
    
    let chs = subData[currSub].chs;
    
    chs.forEach(ch => {
        if(searchVal && !ch.name.toLowerCase().includes(searchVal)) return;
        
        let uniqueId = `${currSub}-${ch.id}`;
        let isDone = true;
        if(ch.types.length === 0) isDone = false;
        ch.types.forEach((type, i) => {
            if(!completedTopics.has(`${uniqueId}-${i}`)) isDone = false;
        });
        
        let dynChIcon = CH_ICONS[(ch.id - 1) % CH_ICONS.length];
        
        grid.innerHTML += `
        <div class="chapter-card ${isDone ? 'completed' : ''}" onclick="openChapterPage(${ch.id})">
            <div style="display:flex; gap:15px; align-items:center;">
                <div class="ch-icon" style="width:50px; height:50px; border-radius:12px; font-size:24px; color:var(--accent); background:var(--acc-light); display:flex; justify-content:center; align-items:center;">
                    ${dynChIcon}
                </div>
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:800; color:var(--text-muted);">CHAPTER ${ch.id}</div>
                    <div style="font-weight:800; font-size:16px; color:var(--secondary);">${ch.name}</div>
                    <div style="font-size:12px; color:var(--accent); font-weight:700; margin-top:5px;">📑 ${ch.types.length} Topics Inside</div>
                </div>
            </div>
            <div style="margin-top:15px; font-size:13px; font-weight:700; color:${isDone ? 'var(--success)' : 'var(--text-muted)'}; text-align:center; padding:10px; background:var(--bg-color); border-radius:8px;">
                ${isDone ? '✅ 100% Completed' : 'Pending Tasks'}
            </div>
        </div>`;
    });
}

// ==========================================================================
// 7. SEPARATE PAGE NAVIGATION SYSTEM (CONCEPT & PRACTICE)
// ==========================================================================
function openChapterPage(chId) {
    selectedChapter = subData[currSub].chs.find(c => c.id === chId);
    
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    document.getElementById('subtopicSelectionPanel').classList.add('active-panel');
    
    document.getElementById('pageChapterNum').innerText = `CHAPTER ${chId} • ${currSub.toUpperCase()}`;
    document.getElementById('pageChapterTitle').innerText = selectedChapter.name;
    
    let listArea = document.getElementById('subtopicListArea');
    listArea.innerHTML = '';
    
    selectedChapter.types.forEach((type, i) => {
        let uniqueTid = `${currSub}-${chId}-${i}`;
        let isDone = completedTopics.has(uniqueTid);
        let dynamicIcon = ST_ICONS[i % ST_ICONS.length];
        
        listArea.innerHTML += `
        <div style="background:var(--white); border:1px solid ${isDone ? 'var(--success)' : 'var(--border)'}; border-radius:12px; padding:20px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow);">
            <div>
                <div style="font-size:16px; font-weight:800; color:var(--secondary); margin-bottom:10px;">${dynamicIcon} ${i+1}. ${type}</div>
                <div style="font-size:12px; font-weight:700; color:${isDone ? 'var(--success)' : 'var(--warning)'}; background:${isDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; padding:4px 10px; border-radius:6px; display:inline-block;">
                    ${isDone ? '✅ Topic Completed' : '⏳ Action Required'}
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; width:100%;">
                <button class="btn-primary" style="width:auto; padding:12px 30px; font-size:15px; font-weight:800; background:var(--accent); box-shadow:0 4px 6px rgba(79, 70, 229, 0.3); border-radius:10px;" onclick="openPracticePage(${i}, '${dynamicIcon}')">✍️ Start Practice</button>
            </div>
        </div>`;
    });
}

function goBackToSubtopics() {
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    document.getElementById('subtopicSelectionPanel').classList.add('active-panel');
    openChapterPage(selectedChapter.id); 
}

function openConceptPage(typeIndex, icon) {
    selectedTopic = { index: typeIndex, name: selectedChapter.types[typeIndex], uniqueId: `${currSub}-${selectedChapter.id}-${typeIndex}` };
    
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    document.getElementById('conceptPanel').classList.add('active-panel');
    
    document.getElementById('conceptTitle').innerHTML = `${selectedChapter.name} ➔ ${icon} ${selectedTopic.name}`;
    
    document.getElementById('conceptContentArea').innerHTML = `
        <h4 style="color:var(--accent); margin-bottom:15px;">📚 Smart Notes, Rules & Formulas</h4>
        <p style="color:var(--text-muted); line-height:1.8;">Welcome to the detailed concept module for <b>${selectedTopic.name}</b>. Detailed theory and rules will be fetched from database here.</p>
        <ul style="margin-top:15px; margin-left:20px; line-height:1.8; color:var(--secondary);">
            <li>Read every rule carefully.</li>
            <li>Note down the bold formulas in your revision copy.</li>
        </ul>
        <div style="margin-top:20px; padding:15px; background:rgba(245, 158, 11, 0.1); border-left:4px solid var(--warning); border-radius:0 8px 8px 0;">
            <b>💡 Pro Tip:</b> Accuracy is more important than speed while learning new concepts.
        </div>
    `;
}

function markConceptUnderstood() {
    completedTopics.add(selectedTopic.uniqueId);
    localStorage.setItem("ranniti_done_topics", JSON.stringify([...completedTopics]));
    alert("Great! Marked as understood.");
    goBackToSubtopics();
}

function openPracticePage(typeIndex, icon) {
    selectedTopic = { index: typeIndex, name: selectedChapter.types[typeIndex] };
    
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    document.getElementById('practicePanel').classList.add('active-panel');
    
    document.getElementById('practiceTitle').innerHTML = `Practice: ${selectedChapter.name} ➔ ${icon} ${selectedTopic.name}`;
    document.getElementById('practiceQuestionArea').innerHTML = ''; 
}

function stopPracticeSession() {
    if(confirm("Are you sure you want to stop this practice session?")) {
        goBackToSubtopics();
    }
}

function getRenderedQuestion(q) {
    let q_en = q.q_en || "Question data missing."; 
    let q_hi = q.q_hi || "प्रश्न उपलब्ध नहीं है।"; 
    
    if(currentStudyMedium === "English") return q_en;
    if(currentStudyMedium === "Hindi") return q_hi;
    return `<span style="color:var(--primary); font-size:16px;">${q_en}</span><br><span style="color:var(--text-muted); font-size:15px; font-weight:600; margin-top:5px; display:block;">${q_hi}</span>`;
}

function checkPracticeAns(id, sel, ans) {
    let card = document.getElementById(`card-p-${id}`); 
    if(card && card.dataset.ans) return; 
    if(card) card.dataset.ans = "1";
    
    let sBtn = document.getElementById(`po-${id}-${sel}`);
    let cBtn = document.getElementById(`po-${id}-${ans}`);
    let viewSolBtn = document.getElementById(`pbtn-${id}`);
    
    if(sel === ans) { 
        if(sBtn) { sBtn.style.background = '#d1fae5'; sBtn.style.borderColor = 'var(--success)'; sBtn.style.color = '#065f46'; }
        recordAnalytics(true);
    } else { 
        if(sBtn) { 
            sBtn.style.background = '#fee2e2'; 
            sBtn.style.borderColor = 'var(--danger)'; 
            sBtn.style.color = '#991b1b'; 
            let blinkCount = 0;
            let blinkInt = setInterval(() => {
                sBtn.style.opacity = (sBtn.style.opacity == '0.5') ? '1' : '0.5';
                blinkCount++;
                if(blinkCount > 4) { clearInterval(blinkInt); sBtn.style.opacity = '1'; }
            }, 150);
        }
        if(cBtn) { cBtn.style.background = '#d1fae5'; cBtn.style.borderColor = 'var(--success)'; cBtn.style.color = '#065f46'; }
        recordAnalytics(false);
    }
    
    if(viewSolBtn) viewSolBtn.style.display = 'block';
}

// ==========================================================================
// 8. SPEED MATH 2.0 (ADAPTIVE AI ENGINE)
// ==========================================================================
let mAns=0, mScore=0, mTime=15, mInt, cOpt=0;
let mathLevel = 1; 
let mathStreak = 0; 
let askedMathQs = []; // रिपीटेशन रोकने के लिए डायरी

function startMathGame() { 
    let setup = document.getElementById('calcSetup');
    let game = document.getElementById('mathGame');
    if(setup) setup.style.display='none'; 
    if(game) game.style.display='block'; 
    
    mScore=0; mathLevel=1; mathStreak=0; askedMathQs=[];
    let sc = document.getElementById('mathScore');
    if(sc) sc.innerHTML = `0 <span style="font-size:12px; color:var(--text-muted);">(Level 1)</span>`; 
    
    genMathQ(); 
}

function stopMathGame() { 
    clearInterval(mInt); 
    let setup = document.getElementById('calcSetup');
    let game = document.getElementById('mathGame');
    if(setup) setup.style.display='block'; 
    if(game) game.style.display='none'; 
    alert(`⚡ Speed Math Session Stopped! \n🎯 Final Score: ${mScore} \n🔥 Highest Level Reached: Level ${mathLevel}`); 
}

// ==========================================================================
// 🔥 ULTIMATE MATH ENGINE (AUTO-LEVEL + BODMAS + FRACTIONS)
// ==========================================================================
let isAutoLevel = true;

window.manualLevelChange = function() {
    let val = document.getElementById('mathLevelSelect').value;
    if(val === 'Auto') {
        isAutoLevel = true; mathStreak = 0; mathLevel = 1;
        alert("🚀 Auto Level-Up On! लगातार सही जवाब देने पर लेवल अपने आप बढ़ेगा।");
    } else {
        isAutoLevel = false; mathLevel = parseInt(val);
        alert(`🎯 Manual Level Set: Level ${mathLevel}`);
    }
    genMathQ();
}

window.genMathQ = function() { 
    clearInterval(mInt);
    let opEl = document.getElementById('mathOp');
    let op = opEl ? opEl.value : '+';
    let qString = ""; let n1, n2; let isUnique = false;
    
    // UI Update for Level
    let lvlIndicator = document.getElementById('mathLevel');
    if(lvlIndicator) lvlIndicator.innerText = isAutoLevel ? `Auto-Lvl ${mathLevel}` : `Lvl ${mathLevel}`;

    while(!isUnique) {
        // ... (Basic operations + Squares/Cubes)
        if(op === '+') { n1 = mathLevel===1?Math.floor(Math.random()*50)+10 : (mathLevel===2?Math.floor(Math.random()*200)+50 : Math.floor(Math.random()*800)+100); n2 = mathLevel===1?Math.floor(Math.random()*50)+10 : (mathLevel===2?Math.floor(Math.random()*200)+50 : Math.floor(Math.random()*800)+100); mAns = n1+n2; qString = `${n1} + ${n2} = ?`; }
        else if(op === '-') { n1 = mathLevel===1?Math.floor(Math.random()*50)+30 : (mathLevel===2?Math.floor(Math.random()*200)+100 : Math.floor(Math.random()*800)+300); n2 = mathLevel===1?Math.floor(Math.random()*30)+5 : (mathLevel===2?Math.floor(Math.random()*100)+20 : Math.floor(Math.random()*400)+100); mAns = n1-n2; qString = `${n1} - ${n2} = ?`; }
        else if(op === '*') { n1 = mathLevel===1?Math.floor(Math.random()*15)+2 : (mathLevel===2?Math.floor(Math.random()*25)+11 : Math.floor(Math.random()*50)+15); n2 = mathLevel===1?Math.floor(Math.random()*10)+2 : (mathLevel===2?Math.floor(Math.random()*15)+5 : Math.floor(Math.random()*30)+11); mAns = n1*n2; qString = `${n1} × ${n2} = ?`; }
        else if(op === '/') { n2 = mathLevel===1?Math.floor(Math.random()*10)+2 : (mathLevel===2?Math.floor(Math.random()*20)+5 : Math.floor(Math.random()*35)+10); let temp = mathLevel===1?Math.floor(Math.random()*10)+2 : (mathLevel===2?Math.floor(Math.random()*20)+5 : Math.floor(Math.random()*30)+5); mAns = temp; n1 = n2 * mAns; qString = `${n1} ÷ ${n2} = ?`; }
        else if(op === 'sq') { n1 = mathLevel===1?Math.floor(Math.random()*15)+1 : (mathLevel===2?Math.floor(Math.random()*20)+16 : Math.floor(Math.random()*15)+36); mAns = n1*n1; qString = `${n1}² = ?`; }
        else if(op === 'cb') { n1 = mathLevel===1?Math.floor(Math.random()*10)+1 : (mathLevel===2?Math.floor(Math.random()*5)+11 : Math.floor(Math.random()*6)+16); mAns = n1*n1*n1; qString = `${n1}³ = ?`; }
        else if(op === 'sqrt') { let r = mathLevel===1?Math.floor(Math.random()*15)+1 : (mathLevel===2?Math.floor(Math.random()*25)+16 : Math.floor(Math.random()*30)+41); n1 = r*r; mAns = r; qString = `√${n1} = ?`; }
        else if(op === 'perc') { let pList = [10, 20, 25, 30, 40, 50, 75, 12.5, 16.66, 33.33, 66.66]; let p = pList[Math.floor(Math.random() * (mathLevel===1?6:pList.length))]; let b = Math.floor(Math.random() * 15) + 5; if (p===12.5){mAns=b; n2=b*8;} else if(p===16.66){mAns=b; n2=b*6;} else if(p===33.33){mAns=b; n2=b*3;} else if(p===66.66){mAns=b*2; n2=b*3;} else if(p===75){mAns=b*3; n2=b*4;} else {n2=b*10; mAns=(p/100)*n2;} mAns = Math.round(mAns); qString = `${p}% of ${n2} = ?`; }
        
        // 🔥 NEW: BODMAS Logic
        else if(op === 'bodmas') {
            if(mathLevel === 1) { let a=Math.floor(Math.random()*10)+2; let b=Math.floor(Math.random()*10)+2; let c=Math.floor(Math.random()*10)+2; mAns = a + (b * c); qString = `${a} + ${b} × ${c} = ?`; }
            else if(mathLevel === 2) { let a=Math.floor(Math.random()*20)+5; let b=Math.floor(Math.random()*15)+5; let c=Math.floor(Math.random()*10)+2; mAns = (a - b) * c; qString = `(${a} - ${b}) × ${c} = ?`; }
            else { let a=Math.floor(Math.random()*15)+5; let b=Math.floor(Math.random()*10)+2; let c=Math.floor(Math.random()*20)+10; let d=Math.floor(Math.random()*5)+2; let t=Math.floor(c/d); c=t*d; mAns = (a * b) + t; qString = `${a} × ${b} + ${c} ÷ ${d} = ?`; }
        }
        
        // 🔥 NEW: Fractions Logic (Returns format like "5/6")
        else if(op === 'frac') {
            if(mathLevel === 1) { let d=Math.floor(Math.random()*5)+3; let a=Math.floor(Math.random()*5)+1; let b=Math.floor(Math.random()*5)+1; mAns = `${a+b}/${d}`; qString = `${a}/${d} + ${b}/${d} = ?`; }
            else if(mathLevel === 2) { let arr=[[2,4], [3,6], [4,8]]; let p=arr[Math.floor(Math.random()*arr.length)]; let a=Math.floor(Math.random()*3)+1; let b=Math.floor(Math.random()*5)+1; let lcm=p[1]; let num=(a*(lcm/p[0]))+b; mAns = `${num}/${lcm}`; qString = `${a}/${p[0]} + ${b}/${p[1]} = ?`; }
            else { let n1=Math.floor(Math.random()*5)+2; let d1=Math.floor(Math.random()*5)+2; let n2=Math.floor(Math.random()*5)+2; let d2=Math.floor(Math.random()*5)+2; mAns = `${n1*n2}/${d1*d2}`; qString = `${n1}/${d1} × ${n2}/${d2} = ?`; }
        }

        if(!askedMathQs.includes(qString)) { askedMathQs.push(qString); if(askedMathQs.length > 20) askedMathQs.shift(); isUnique = true; }
    }
    
    let qd = document.getElementById('mathQuestion');
    if(qd) qd.innerText = qString; 
    
    let opts = [mAns]; 
    while(opts.length < 4) { 
        let fakeAns;
        // String Fake Answer for Fractions
        if(typeof mAns === 'string' && mAns.includes('/')) {
            let pts = mAns.split('/'); let fN = parseInt(pts[0]) + (Math.random()<0.5?1:-1)*Math.floor(Math.random()*5+1);
            if(fN <= 0) fN = parseInt(pts[0]) + 1;
            fakeAns = `${fN}/${pts[1]}`;
        } else {
            let v = mathLevel===1?5:(mathLevel===2?15:30);
            fakeAns = mAns + (Math.random()<0.5?1:-1)*Math.floor(Math.random()*v+1); 
        }
        if(!opts.includes(fakeAns) && fakeAns !== mAns) opts.push(fakeAns); 
    } 
    opts.sort(() => Math.random() - 0.5); 
    cOpt = opts.indexOf(mAns); 
    
    let og = document.getElementById('mathOptionsGrid');
    if(og) {
        og.innerHTML = '';
        for(let i=0; i<4; i++) { 
            og.innerHTML += `<button id="mOpt${i}" onclick="checkMathOpt(${i})" style="padding:20px; font-size:24px; border-radius:12px; cursor:pointer; font-weight:800; border:2px solid var(--border); background:var(--white); color:var(--secondary); transition:0.2s;">${opts[i]}</button>`;
        } 
    }
    
    mTime = (op==='bodmas' || op==='frac' || op==='cb' || op==='perc') ? (mathLevel===1?20:(mathLevel===2?15:12)) : (mathLevel===1?15:(mathLevel===2?10:8)); 
    let mt = document.getElementById('mathTime');
    if(mt) mt.innerText = mTime; 
    
    mInt = setInterval(() => { 
        mTime--; if(mt) mt.innerText=mTime; 
        if(mTime<=0) { 
            clearInterval(mInt); 
            let cB = document.getElementById('mOpt'+cOpt);
            if(cB) { cB.style.background = 'var(--success)'; cB.style.color = 'white'; }
            mathStreak = 0; 
            if(isAutoLevel && mathLevel > 1) mathLevel--; 
            setTimeout(genMathQ, 1000); 
        } 
    }, 1000); 
}

window.checkMathOpt = function(idx) { 
    clearInterval(mInt); 
    let btn = document.getElementById('mOpt'+idx); 
    let allBtns = document.querySelectorAll('#mathOptionsGrid button');
    
    if(idx === cOpt) { 
        btn.style.background = 'var(--success)'; btn.style.color = 'white'; 
        mathStreak++;
        
        // 🚀 AUTO LEVEL UP LOGIC: 10 सही पर Medium, और 15 सही पर Hard!
        if(isAutoLevel) {
            if(mathLevel === 1 && mathStreak >= 10) {
                mathLevel = 2; mathStreak = 0; alert("🔥🔥 Amazing! Level Upgraded to MEDIUM!");
            } else if(mathLevel === 2 && mathStreak >= 15) {
                mathLevel = 3; mathStreak = 0; alert("👑👑 UNSTOPPABLE! Level Upgraded to HARD!");
            }
        }
    } else { 
        btn.style.background = 'var(--danger)'; btn.style.color = 'white'; 
        let cB = document.getElementById('mOpt'+cOpt);
        if(cB) { cB.style.background = 'var(--success)'; cB.style.color = 'white'; }
        mathStreak = 0;
        
        // 📉 AUTO LEVEL DOWN LOGIC: गलत होने पर लेवल गिरेगा
        if(isAutoLevel && mathLevel > 1) {
            mathLevel--;
            alert("⚠️ Level Down! थोड़ा और फोकस करो।");
        }
    } 
    
    allBtns.forEach(b => b.disabled = true);
    setTimeout(genMathQ, 1000); 
}


// ==========================================================================
// 🚀 SMART MOCK TEST ENGINE (TCS PATTERN & NO-REPEAT)
// ==========================================================================
let mockQuestions = [];
let currentMockIndex = 0;
let mockScore = 0;

function startMockTest() {
    if(!currentUser || currentUser.role === 'guest') {
        alert("⚠️ Mock Test देने के लिए कृपया अपना अकाउंट रजिस्टर करें!");
        return;
    }

    let subj = document.getElementById('mockSubject').value;
    let diff = document.getElementById('mockDiff').value;

    // AI Tracker: बच्चे की प्रोफाइल में No-Repeat डायरी चेक करो
    if(!currentUser.attemptedMockQs) currentUser.attemptedMockQs = [];

    // Filter Logic: सिर्फ वही सवाल निकालो जो बच्चे ने आज तक नहीं देखे!
    mockQuestions = questionsDB.filter(q => {
        let matchSubj = (subj === 'All' || q.subject === subj);
        let matchDiff = (diff === 'All' || q.difficulty === diff);
        let notAttempted = !currentUser.attemptedMockQs.includes(q.id); // 🛑 No-Repeat Rule
        return matchSubj && matchDiff && notAttempted;
    });

    if(mockQuestions.length === 0) {
        document.getElementById('mockQuestionArea').innerHTML = `
            <div style="text-align:center; padding:30px; border:2px dashed var(--warning); border-radius:10px; color:var(--warning);">
                <h3>🎉 गज़ब!</h3>
                <p>आपने इस सब्जेक्ट और लेवल के सारे सवाल सॉल्व कर लिए हैं! कृपया नया लेवल चुनें या एडमिन के नए सवाल डालने का इंतज़ार करें।</p>
            </div>`;
        return;
    }

    // सवालों को Random (शफल) करना
    mockQuestions.sort(() => Math.random() - 0.5);
    mockQuestions = mockQuestions.slice(0, 10); // एक बार में सिर्फ 10 सवाल का टेस्ट

    currentMockIndex = 0;
    mockScore = 0;
    renderMockQuestion();
}

function renderMockQuestion() {
    let area = document.getElementById('mockQuestionArea');
    
    if(currentMockIndex >= mockQuestions.length) {
        endMockTest();
        return;
    }

    let q = mockQuestions[currentMockIndex];
    let qText = getRenderedQuestion(q); // इंग्लिश/हिंदी मीडियम के हिसाब से

    let html = `
        <div style="background:var(--white); padding:25px; border-radius:12px; border:2px solid var(--border); box-shadow:var(--card-shadow);">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                <span style="font-weight:800; color:var(--primary); background:var(--acc-light); padding:5px 15px; border-radius:20px;">Question ${currentMockIndex + 1} of ${mockQuestions.length}</span>
                <span style="font-weight:800; color:var(--danger);"><i class="fa-solid fa-laptop-file"></i> TCS Exam Engine</span>
            </div>
            
            <h3 style="margin-bottom:25px; color:var(--secondary); line-height:1.6;">${qText}</h3>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                <button id="optA" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'A', '${q.ans}')">A) ${q.a}</button>
                <button id="optB" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'B', '${q.ans}')">B) ${q.b}</button>
                <button id="optC" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'C', '${q.ans}')">C) ${q.c}</button>
                <button id="optD" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'D', '${q.ans}')">D) ${q.d}</button>
            </div>
        </div>
    `;
    
    area.innerHTML = html;
    
    // CSS Design for Options
    document.querySelectorAll('.mock-opt').forEach(btn => {
        btn.style.padding = '15px 20px'; btn.style.textAlign = 'left';
        btn.style.border = '2px solid var(--border)'; btn.style.borderRadius = '8px';
        btn.style.background = 'var(--bg-color)'; btn.style.cursor = 'pointer';
        btn.style.fontWeight = '700'; btn.style.fontSize = '15px'; btn.style.transition = '0.2s';
        btn.style.color = 'var(--secondary)';
    });
}

function submitMockAnswer(qId, selectedOpt, correctOpt) {
    // 1. बच्चे की डायरी में सवाल का ID सेव करो (No-Repeat)
    currentUser.attemptedMockQs.push(qId);
    localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));

    let isCorrect = (selectedOpt === correctOpt);
    if(isCorrect) mockScore++;

    // 2. रंगों से सही/गलत दिखाओ
    document.getElementById('opt' + selectedOpt).style.background = isCorrect ? '#d1fae5' : '#fee2e2';
    document.getElementById('opt' + selectedOpt).style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
    
    if(!isCorrect) {
        document.getElementById('opt' + correctOpt).style.background = '#d1fae5';
        document.getElementById('opt' + correctOpt).style.borderColor = 'var(--success)';
    }

    // 3. सारे बटन Lock कर दो
    document.querySelectorAll('.mock-opt').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
    });

    // 4. अगले सवाल पर जाओ (1.5 सेकंड बाद)
    setTimeout(() => {
        currentMockIndex++;
        renderMockQuestion();
    }, 1500);
}

function endMockTest() {
    let area = document.getElementById('mockQuestionArea');
    let accuracy = Math.round((mockScore / mockQuestions.length) * 100);
    
    area.innerHTML = `
        <div style="text-align:center; padding:40px; border:2px dashed var(--success); border-radius:12px; background:#f0fdf4; animation:fadeIn 0.5s;">
            <i class="fa-solid fa-trophy" style="font-size:50px; color:var(--warning); margin-bottom:15px;"></i>
            <h2 style="color:var(--success); margin-bottom:10px;">Test Completed Successfully!</h2>
            <p style="font-size:20px; font-weight:800; color:var(--secondary);">Score: ${mockScore} / ${mockQuestions.length}</p>
            <p style="font-size:16px; color:var(--text-muted); margin-bottom:25px; font-weight:700;">Your Accuracy: ${accuracy}%</p>
            
            <button class="btn-primary" style="margin:0 auto; width:auto; padding:12px 25px;" onclick="document.getElementById('mockQuestionArea').innerHTML='<p style=\\'text-align:center; color:var(--text-muted); font-weight:600;\\'>Select parameters above to start a new test.</p>'">Start New Test</button>
        </div>
    `;
}

// ==========================================================================
// 📊 STEP 3: ADVANCED ANALYTICS & SMART REPORT CARD
// ==========================================================================
function updateAnalyticsUI() {
    let container = document.getElementById('analyticsContent');
    if(!container) return;

    // Agar guest hai ya login nahi kiya toh data nahi dikhega
    if(!currentUser || currentUser.role === 'guest') {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-muted);">
            <i class="fa-solid fa-chart-pie" style="font-size:50px; margin-bottom:15px; opacity:0.5;"></i>
            <h3>No Data Available</h3>
            <p style="margin-top:10px;">Please register and practice some questions to see your AI Analytics.</p>
        </div>`;
        return;
    }

    // 1. Calculations: Time aur Questions
    let studyMins = currentUser.studyTime ? Math.floor(currentUser.studyTime / 60) : 0;
    let mockAttempts = currentUser.attemptedMockQs ? currentUser.attemptedMockQs.length : 0;
    
    // 2. AI Logic: Weak Topics ko nikalna
    let weakHTML = "";
    if(currentUser.weakTopics && Object.keys(currentUser.weakTopics).length > 0) {
        // Jisme sabse jyada galti ki hai, use pehle dikhao (Sorting)
        let sortedWeak = Object.entries(currentUser.weakTopics)
                            .sort((a,b) => b[1] - a[1])
                            .slice(0, 5); // Top 5 weak topics
                            
        weakHTML = sortedWeak.map(w => `
            <span style="background:#fee2e2; color:#991b1b; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:bold; margin-right:8px; display:inline-block; margin-bottom:8px; border:1px solid #fca5a5;">
                ⚠️ ${w[0]} <span style="background:#991b1b; color:white; padding:2px 6px; border-radius:4px; margin-left:5px; font-size:11px;">${w[1]} Mistakes</span>
            </span>
        `).join('');
    } else {
        weakHTML = `<div style="padding:15px; background:#dcfce7; color:#065f46; border-radius:8px; font-weight:700; border:1px solid #86efac;">🌟 Awesome! You haven't made any repeated mistakes yet. Keep it up!</div>`;
    }

    // 3. UI Design Render Karna
    let html = `
        <h2 style="margin-bottom:25px;"><i class="fa-solid fa-chart-pie" style="color:#9333ea;"></i> My AI Performance Analytics</h2>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:20px; margin-bottom:30px;">
            <div style="background:var(--white); padding:25px; border-radius:16px; border:1px solid var(--border); text-align:center; box-shadow:var(--card-shadow); transition:0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <i class="fa-solid fa-stopwatch" style="font-size:35px; color:var(--primary); margin-bottom:15px;"></i>
                <div style="font-size:28px; font-weight:800; color:var(--secondary);">${studyMins} <span style="font-size:16px; color:var(--text-muted);">Mins</span></div>
                <div style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Total Focus Time</div>
            </div>
            
            <div style="background:var(--white); padding:25px; border-radius:16px; border:1px solid var(--border); text-align:center; box-shadow:var(--card-shadow); transition:0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <i class="fa-solid fa-bullseye" style="font-size:35px; color:var(--success); margin-bottom:15px;"></i>
                <div style="font-size:28px; font-weight:800; color:var(--secondary);">${mockAttempts} <span style="font-size:16px; color:var(--text-muted);">Qs</span></div>
                <div style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:5px;">Unique Questions Solved</div>
            </div>
        </div>

        <div style="background:var(--white); padding:30px; border-radius:16px; border:1px solid var(--border); box-shadow:var(--card-shadow);">
            <h3 style="margin-bottom:10px; color:var(--secondary);"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Weak Areas (Needs Revision)</h3>
            <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px; font-weight:600;">The AI Teacher has noticed you are making mistakes in these topics. We recommend reading the concepts again.</p>
            <div>${weakHTML}</div>
        </div>
    `;
    
    container.innerHTML = html;
} 

// ==========================================================================
// 📢 STEP 4: AUTO SARKARI JOB NOTIFICATIONS (LIVE ALERT SYSTEM)
// ==========================================================================

// ==========================================================================
// 🏢 REAL-TIME JOB ALERTS & ADMIN DATABASE LOGIC
// ==========================================================================
function fetchLatestJobs() {
    let list = document.getElementById('sarkariJobsList');
    if(list) list.innerHTML = '<p style="text-align:center; color:var(--primary); font-weight:700; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Live Jobs Update ho rahi hain...</p>';

    setTimeout(() => {
        // Agar pehle se koi jobs save nahi hain toh empty array set karein
        if(!jobsDB || jobsDB.length === 0) {
            jobsDB = [
                { id: "JOB_DEMO", title: "Welcome to Ranniti Job Center", orgType: "Notice", qual: "All Students", details: "Admin panel se nayi jobs add karein!", link: "#" }
            ];
        }
        
        // Puraane renderJobs ko call karein taaki data screen par aaye
        renderJobs();
        
        // 🔴 Notification Red Badge Logic
        if(jobsDB.length > 0 && jobsDB[0].id !== "JOB_DEMO") {
            let lastSeenJob = localStorage.getItem("ranniti_last_seen_job");
            let badge = document.getElementById('jobBadge');
            if (badge && lastSeenJob !== jobsDB[0].id) {
                badge.innerText = "New";
                badge.style.display = 'inline-block';
            }
        }
    }, 600);
}

window.toggleGovtLevel = function() {
    let type = document.getElementById('adminJobType').value;
    let govtLevel = document.getElementById('adminGovtLevel');
    if(govtLevel) govtLevel.style.display = (type === 'Government') ? 'block' : 'none';
};

window.sendAdminJobAlert = function() {
    let title = document.getElementById('adminJobTitle').value.trim();
    let qual = document.getElementById('adminJobQual').value.trim();
    let link = document.getElementById('adminJobLink').value.trim();
    
    let jobType = document.getElementById('adminJobType') ? document.getElementById('adminJobType').value : "Government";
    let govtLevel = document.getElementById('adminGovtLevel') ? document.getElementById('adminGovtLevel').value : "Central";

    if(!title || !link) { alert("⚠️ Title and Link are required!"); return; }

    let finalType = (jobType === "Government") ? govtLevel : "Private";

    let newJob = {
        id: "JOB_" + Date.now(),
        title: title,
        qual: qual || "Any Pass",
        link: link,
        jobType: jobType,
        jobLevel: finalType,
        date: new Date().toLocaleDateString()
    };

    if(jobsDB.length > 0 && jobsDB[0].id === "JOB_DEMO") {
        jobsDB = [];
    }
    
    jobsDB.unshift(newJob);
    localStorage.setItem("ranniti_jobs_db", JSON.stringify(jobsDB));
    
    alert(`✅ Job Alert Sent!\n📂 Category: ${jobType}\n📌 Type: ${finalType}`);
    
    document.getElementById('adminJobTitle').value = "";
    document.getElementById('adminJobQual').value = "";
    document.getElementById('adminJobLink').value = "";
    
    if(typeof fetchLatestJobs === 'function') fetchLatestJobs();
};
function showJobNotification(job) {
    let toast = document.createElement('div');
    toast.innerHTML = `
        <div style="position:fixed; bottom:30px; left:30px; background:var(--white); border:2px solid var(--primary); padding:20px; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2); z-index:99999; animation:fadeIn 0.5s; max-width:320px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span style="font-weight:800; color:var(--primary); font-size:12px; text-transform:uppercase; background:var(--acc-light); padding:4px 10px; border-radius:8px;"><i class="fa-solid fa-bell fa-shake"></i> New Job Alert</span>
                <i class="fa-solid fa-xmark" style="cursor:pointer; color:var(--text-muted); font-size:18px;" onclick="this.parentElement.parentElement.remove()"></i>
            </div>
            <h3 style="color:var(--secondary); font-size:17px; margin-bottom:8px; line-height:1.4;">${job.title}</h3>
            <p style="font-size:13px; font-weight:700; color:var(--danger); margin-bottom:15px;">Apply Before: ${job.lastDate}</p>
            <button class="btn-primary" style="width:100%; padding:12px;" onclick="window.open('${job.link}', '_blank'); this.parentElement.parentElement.remove()">View Details</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    // 10 सेकंड बाद पॉप-अप अपने आप गायब हो जाएगा
    setTimeout(() => { if(toast) toast.remove(); }, 10000);
}

// 🚀 ट्रिगर: जैसे ही वेबसाइट पूरी लोड हो जाए, 3 सेकंड बाद API चेक करो
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fetchLatestJobs, 3000); 
});

// ==========================================================================
// 9. LIBRARY MANAGER, JOBS CENTER & PLANNER
// ==========================================================================
function renderLibrary() {
    let actLib = document.querySelector('.lib-content[style*="display: block"]');
    if(!actLib) return;
    
    let typeMap = { 'lib-syllabus': 'syllabus', 'lib-ncert': 'ncert', 'lib-papers': 'papers', 'lib-roadmap': 'roadmap' };
    let curType = null;
    for(let k in typeMap) { if(actLib.id === k) curType = typeMap[k]; }
    
    if(curType) {
        let filtered = libraryDB.filter(l => l.cat === curType);
        if(filtered.length > 0) {
            actLib.innerHTML = filtered.map(l => `
                <div style="padding:15px; border:1px solid var(--border); border-radius:10px; background:var(--white); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; font-size:15px; color:var(--secondary);"><i class="fa-solid fa-file-pdf" style="color:var(--danger); margin-right:10px;"></i>${l.title}</div>
                    <a href="${l.url}" target="_blank" style="padding:8px 15px; background:var(--bg-color); color:var(--primary); text-decoration:none; border-radius:6px; font-weight:bold; border:1px solid var(--border); font-size:13px;">Open/Download</a>
                </div>
            `).join('');
        }
    }
}

function addLibraryData() {
    let cat = document.getElementById('libCat').value;
    let title = document.getElementById('libTitle').value.trim();
    let url = document.getElementById('libUrl').value.trim();
    
    if(!title || !url) { alert("Title and URL required!"); return; }
    
    libraryDB.push({ id: Date.now(), cat, title, url });
    localStorage.setItem("ranniti_library_db", JSON.stringify(libraryDB));
    
    document.getElementById('libTitle').value = '';
    document.getElementById('libUrl').value = '';
    alert("Library Content Added Successfully!");
    renderLibrary();
}

function renderJobs() {
    let list = document.getElementById('sarkariJobsList');
    if(!list) return;
    
    if(jobsDB.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:30px; border:2px dashed var(--border); border-radius:12px; color:var(--text-muted); font-weight:600;">No Job Alerts posted yet.</div>`;
    } else {
        list.innerHTML = jobsDB.map(j => `
            <div style="padding:15px; border-bottom:1px solid var(--border); transition:0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:800; color:var(--primary); font-size:16px;">${j.title}</div>
                    <span style="font-size:11px; background:#dcfce7; color:#065f46; padding:4px 8px; border-radius:6px; font-weight:800; border:1px solid #a7f3d0;">${j.orgType}</span>
                </div>
                <div style="font-size:13px; color:var(--text-muted); margin-top:8px; font-weight:600;">Req: ${j.qual} | ${j.details}</div>
                <button class="btn-primary" style="margin-top:12px; padding:8px 15px; font-size:12px; width:auto; border-radius:8px;" onclick="addAppliedForm('${j.title}')">Mark as Applied</button>
            </div>
        `).reverse().join('');
    }
    renderAppliedForms();
}

function addAppliedFormPrompt() {
    if(!currentUser || currentUser.role === 'guest') { alert("Please create a profile to save forms!"); return; }
    let formName = prompt("Enter the Name of Exam you applied for:");
    if(formName) { addAppliedForm(formName); }
}

function addAppliedForm(name) {
    if(!name || !currentUser || currentUser.role === 'guest') { alert("Please login to save forms!"); return; }
    if(!currentUser.appliedForms) currentUser.appliedForms = [];
    if(!currentUser.appliedForms.includes(name)) {
        currentUser.appliedForms.push(name);
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        alert("Success! Form saved to your Tracker.");
        renderAppliedForms();
    } else { alert("You have already added this form!"); }
}

function renderAppliedForms() {
    let aList = document.getElementById('appliedFormsList');
    if(!aList || !currentUser || !currentUser.appliedForms) return;
    
    if(currentUser.appliedForms.length === 0) {
        aList.innerHTML = `<div style="text-align:center; padding:30px; background:var(--white); border-radius:12px; border:2px dashed var(--border); color:var(--text-muted); font-weight:600;">No forms applied yet. Track your journey here.</div>`; 
        return; 
    }
    
    aList.innerHTML = currentUser.appliedForms.map(f => `
        <div style="background:var(--white); padding:18px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--card-shadow);">
            <div style="font-weight:800; color:var(--secondary); font-size:15px;">${f}</div>
            <div style="font-size:11px; background:#fef3c7; color:#d97706; padding:6px 10px; border-radius:6px; font-weight:800; border:1px solid #fde68a;">Exam Pending</div>
        </div>
    `).join('');
}

let currentPlanTasks = [];
function generateDailyPlan() {
    let pList = document.getElementById('plannerList');
    if(!pList) return;
    
    currentPlanTasks = [
        { text: "Read Daily Current Affairs (15 Mins)", done: false },
        { text: "Solve 1 Full Mock Test", done: false },
        { text: "15 Mins Speed Math Calculation Practice", done: false },
        { text: "Revise Grammar Rules & Formulas", done: false }
    ];
    renderPlannerTasks();
}

function renderPlannerTasks() {
    let list = document.getElementById('plannerList');
    if(!list) return;
    
    list.innerHTML = currentPlanTasks.map((t, i) => `
        <div style="display:flex; align-items:center; gap:15px; padding:18px; background:var(--white); border:1px solid var(--border); border-radius:12px; margin-bottom:12px; cursor:pointer; box-shadow:var(--card-shadow); transition:0.2s;" onclick="togglePlannerTask(${i})">
            <div style="width:26px; height:26px; border-radius:8px; border:2px solid ${t.done?'var(--success)':'var(--primary)'}; background:${t.done?'var(--success)':'transparent'}; color:white; display:flex; justify-content:center; align-items:center; font-size:14px; font-weight:bold;">
                ${t.done ? '✓' : ''}
            </div>
            <div style="font-weight:700; font-size:15px; color:var(--secondary); text-decoration:${t.done?'line-through':'none'}; opacity:${t.done?'0.5':'1'}; transition:0.2s;">
                ${t.text}
            </div>
        </div>
    `).join('');
}

// ==========================================================================
// 📥 SMART BULK IMPORT (WITH LEVEL & MEDIUM SUPPORT)
// ==========================================================================
window.processBulkImport = function() {
    let rawData = document.getElementById('bulkData').value;
    let cat = document.getElementById('adminSubj').value;
    let topic = document.getElementById('adminTopic').value || "Mixed";
    let subcat = document.getElementById('adminSubtopic').value || "General";
    
    // 🔥 New: Fetching Difficulty Level
    let difficulty = document.getElementById('adminQLevel') ? document.getElementById('adminQLevel').value : "Medium";
    let medium = document.getElementById('adminQMedium') ? document.getElementById('adminQMedium').value : "Bilingual";

    if(!rawData.trim()) { alert("⚠️ Please paste some questions first!"); return; }

    let qBlocks = rawData.split('---').filter(b => b.trim().length > 10);
    let count = 0;

    qBlocks.forEach(block => {
        let qEn = block.match(/\[Q_EN\]:\s*(.+)/);
        let qHi = block.match(/\[Q_HI\]:\s*(.+)/);
        let a = block.match(/\[A\]:\s*(.+)/); let b = block.match(/\[B\]:\s*(.+)/);
        let c = block.match(/\[C\]:\s*(.+)/); let d = block.match(/\[D\]:\s*(.+)/);
        let ans = block.match(/\[ANS\]:\s*([A-D])/i);
        let trick = block.match(/\[TRICK\]:\s*(.+)/);
        let exam = block.match(/\[EXAM\]:\s*(.+)/);

        if((qEn || qHi) && a && b && c && d && ans) {
            let qObj = {
                id: "Q_" + Date.now() + Math.floor(Math.random()*1000),
                category: cat, 
                topic: topic, 
                subtopic: subcat,
                level: difficulty, // 🔥 LEVEL SAVED IN DATABASE!
                medium: medium, 
                q_en: qEn ? qEn[1].trim() : "", q_hi: qHi ? qHi[1].trim() : "",
                opts: { A: a[1].trim(), B: b[1].trim(), C: c[1].trim(), D: d[1].trim() },
                ans: ans[1].trim().toUpperCase(),
                trick: trick ? trick[1].trim() : "Apply basic logic.",
                examLevel: exam ? exam[1].trim() : "LEVEL-1"
            };
            questionsDB.push(qObj);
            count++;
        }
    });

    if(count > 0) {
        localStorage.setItem("ranniti_exam_db", JSON.stringify(questionsDB));
        alert(`✅ ${count} Questions Successfully Added!\n\n📂 Hierarchy: [${cat}] ➔ [${topic}] ➔ [${subcat}]\n📈 Level: ${difficulty}\n🗣️ Medium: ${medium}`);
        document.getElementById('bulkData').value = "";
    } else {
        alert("⚠️ Invalid Format! Please check the structure of your questions.");
    }
}

// ==========================================
// 🔥 FIREBASE AUTHENTICATION (REGISTER)
// ==========================================

function registerUser() {
    let fName = document.getElementById('regFirstName').value.trim();
    let email = document.getElementById('regEmail').value.trim();
    let pass = document.getElementById('regPassword').value.trim();
    
    if(!fName || !email || !pass) { 
        alert("Name, Email and Password are required!"); 
        return; 
    }
    
    auth.createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        userCredential.user.sendEmailVerification().then(() => {
            alert("🛑 आपका अकाउंट बन गया है!\n\n📩 हमने आपके Email पर एक Verification Link भेजा है। कृपया अपना Inbox या Spam फोल्डर चेक करें!");
        });

        currentUser = { 
            firstName: fName, 
            lastName: document.getElementById('regLastName') ? document.getElementById('regLastName').value.trim() : "",
            email: email, 
            role: "student",
            gender: document.getElementById('regGender') ? document.getElementById('regGender').value : "Male",
            dob: document.getElementById('regDob') ? document.getElementById('regDob').value : "",
            phone: document.getElementById('regPhone') ? document.getElementById('regPhone').value : "",
            diploma: document.getElementById('regDiploma') ? document.getElementById('regDiploma').value : "",
            qualification: document.getElementById('regQualification') ? document.getElementById('regQualification').value : "12th Pass",
            pursuing: document.getElementById('regPursuing') ? document.getElementById('regPursuing').value : "None",
            location: document.getElementById('regLocation') && document.getElementById('regLocation').value !== "Fetching data..." ? document.getElementById('regLocation').value : "India",
            timeline: document.getElementById('regTimeline') ? document.getElementById('regTimeline').value : "1 Year",
            designation: document.getElementById('regDesignation') ? document.getElementById('regDesignation').value : "Future Achiever",
            medium: document.getElementById('regMedium') ? document.getElementById('regMedium').value : "Bilingual",
            studyTime: 0, 
            appliedForms: [],
            profilePic: null,
            weakTopics: {},
            attemptedMockQs: []
        };
        
        usersDB.push(currentUser);
        localStorage.setItem("ranniti_users_master", JSON.stringify(usersDB));
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        
        checkAuth();
    })
    .catch((error) => {
        alert("❌ अकाउंट बनाने में एरर: " + error.message);
    });
}

// ==========================================================================
// 🛠️ MISSING FUNCTIONS (BUG FIXES)
// ==========================================================================
function recordAnalytics(isCorrect) {
    if(!advStats) advStats = { totalAttempts: 0, totalCorrect: 0 };
    advStats.totalAttempts++;
    if(isCorrect) advStats.totalCorrect++;
    localStorage.setItem("ranniti_analytics", JSON.stringify(advStats));
}

function renderAdminQuestions() {
    let list = document.getElementById('adminQuestionList');
    if(!list) return;
    
    if(questionsDB.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); padding:10px; font-weight:600;">अभी डेटाबेस में कोई सवाल नहीं है। ऊपर बॉक्स में पेस्ट करें!</p>';
        return;
    }
    
    list.innerHTML = `
        <div style="padding:15px; background:#dcfce7; color:#065f46; border-radius:12px; font-weight:800; border:1px solid #86efac;">
            ✅ Database Status: ${questionsDB.length} Questions Successfully Loaded in System!
        </div>
    `;
}

// ==========================================================================
// 🛠️ FINAL BUG FIXES (SMART BOOK & ADMIN CONNECTION)
// ==========================================================================

function switchTrackerSubj(subj) {
    currSub = subj;
    document.querySelectorAll('#module-book .t-tab').forEach(b => b.classList.remove('active'));
    if(typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
    }
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    if(subData[subj]) document.body.classList.add(`theme-${subData[subj].color}`);
    
    searchVal = '';
    let si = document.getElementById('searchInput');
    if(si) si.value = '';
    renderTrackerCards();
}

function switchLibraryTab(tab) {
    document.querySelectorAll('#materialPanel .t-tab').forEach(b => b.classList.remove('active'));
    if(typeof event !== 'undefined' && event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.lib-content').forEach(c => c.style.display = 'none');
    let lc = document.getElementById('lib-' + tab); if(lc) lc.style.display = 'block';
    if(typeof renderLibrary === 'function') renderLibrary();
}

function switchJobsTab(tab) {
    document.querySelectorAll('#jobsPanel .t-tab').forEach(b => b.classList.remove('active'));
    if(typeof event !== 'undefined' && event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.jobs-content').forEach(c => c.style.display = 'none');
    let jc = document.getElementById('jobs-' + tab); if(jc) jc.style.display = 'block';
}

function updateAdminTopics() {
    let subj = document.getElementById('adminSubj');
    let topicSelect = document.getElementById('adminTopic');
    if(!subj || !topicSelect) return;
    
    let subKey = subj.value;
    if(subKey === 'General Knowledge') subKey = 'GK';
    
    let chs = subData[subKey] ? subData[subKey].chs : [];
    topicSelect.innerHTML = chs.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    updateAdminSubtopics();
}

function updateAdminSubtopics() {
    let subj = document.getElementById('adminSubj');
    let topicSelect = document.getElementById('adminTopic');
    let subtopicSelect = document.getElementById('adminSubtopic');
    if(!subj || !topicSelect || !subtopicSelect) return;
    
    let subKey = subj.value;
    if(subKey === 'General Knowledge') subKey = 'GK';
    
    if(subData[subKey]) {
        let chapter = subData[subKey].chs.find(c => c.name === topicSelect.value);
        if(chapter && chapter.types.length > 0) {
            subtopicSelect.innerHTML = chapter.types.map(t => `<option value="${t}">${t}</option>`).join('');
        } else {
            subtopicSelect.innerHTML = '<option value="">No Subtopics</option>';
        }
    }
}
// ==========================================================================
// 🚀 SUPER UPDATE: SMART GRAPH, LEVEL FILTER & ADMIN FIXES
// ==========================================================================

// 🛠️ 1. ADMIN PANEL FIX: अब सवाल ऐड होते ही स्क्रीन पर दिखेंगे!
function renderAdminQuestions() {
    let list = document.getElementById('adminQuestionList');
    if(!list) return;

    if(questionsDB.length === 0) {
        list.innerHTML = '<p style="color:var(--danger); padding:10px; font-weight:800; text-align:center;">⚠️ डेटाबेस खाली है! ऊपर से सवाल Import करें।</p>';
        return;
    }

    let html = `<div style="padding:15px; background:#dcfce7; color:#065f46; border-radius:12px; font-weight:800; border:1px solid #86efac; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        ✅ Database Status: ${questionsDB.length} Questions Live!
    </div>`;

    html += `<h3 style="margin-bottom:15px; color:var(--primary);"><i class="fa-solid fa-list-check"></i> Recently Added Questions:</h3>`;
    
    // सिर्फ़ आख़िरी 5 जोड़े गए सवाल दिखाएंगे ताकि पेज हैंग न हो
    html += questionsDB.slice(-5).reverse().map(q => `
        <div style="background:var(--white); border:2px solid var(--border); padding:15px; border-radius:12px; margin-bottom:15px; box-shadow:var(--card-shadow);">
            <div style="margin-bottom:10px;">
                <span style="font-size:11px; background:var(--primary); color:white; padding:4px 8px; border-radius:6px; font-weight:bold;">${q.examTarget || 'ALL'}</span>
                <span style="font-size:11px; background:var(--warning); color:white; padding:4px 8px; border-radius:6px; margin-left:5px; font-weight:bold;">${q.difficulty || 'Moderate'}</span>
                <strong style="margin-left:10px; color:var(--text-muted); font-size:13px;">${q.subject} ➔ ${q.topic}</strong>
            </div>
            <p style="font-size:15px; font-weight:700; color:var(--secondary); margin-bottom:10px;">Q: ${q.q_en || q.q_hi}</p>
            <button onclick="deleteQuestion('${q.id}')" style="background:var(--danger); color:white; border:none; padding:6px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
    `).join('');

    list.innerHTML = html;
}

// 🛠️ 2. LEVEL BUTTON FIX: Practice Page में Level बटन अब मक्खन की तरह काम करेंगे
window.changePracticeLevel = function(level, btnElement) {
    // 1. बटन का रंग बदलना (Active State)
    if(btnElement) {
        let parent = btnElement.parentElement;
        let siblings = parent.querySelectorAll('button');
        siblings.forEach(s => {
            s.style.background = 'var(--white)';
            s.style.color = 'var(--text-muted)';
            s.style.border = '2px solid var(--border)';
        });
        btnElement.style.background = 'var(--primary)';
        btnElement.style.color = 'white';
        btnElement.style.border = '2px solid var(--primary)';
    }
    
    // 2. सवालों को फ़िल्टर करना
    loadPracticePageQuestions(level);
}


// 🛠️ 3. DUAL ANALYTICS GRAPH: Numbers + Visual Graph
window.showDualAnalytics = function() {
    // 🔥 SUPER FIX: अगर HTML में ग्राफ़ का डिब्बा नहीं है, तो JS खुद बना लेगा!
    let area = document.getElementById('analyticsContent');
    
    if(!area) {
        let dashboard = document.getElementById('studentDashboard') || document.querySelector('.panel-content') || document.body;
        let newArea = document.createElement('div');
        newArea.id = 'analyticsContent';
        dashboard.prepend(newArea); // सबसे ऊपर ग्राफ़ दिखाएगा
        area = newArea;
    }

    let att = advStats.totalAttempts || 0;
    let corr = advStats.totalCorrect || 0;
    let wrong = att - corr;
    let acc = att > 0 ? Math.round((corr / att) * 100) : 0;
    let errorRate = att > 0 ? Math.round((wrong / att) * 100) : 0;

    area.innerHTML = `
        <div style="background:var(--white); padding:25px; border-radius:16px; margin-bottom:25px; box-shadow:var(--card-shadow); border:1px solid var(--border);">
            <h3 style="margin-bottom:20px; color:var(--secondary); font-weight:800; font-size:18px;"><i class="fa-solid fa-chart-pie" style="color:var(--primary);"></i> Your Performance Graph</h3>

            <div style="display:flex; gap:15px; margin-bottom:25px;">
                <div style="flex:1; background:#f0fdf4; padding:15px; border-radius:12px; text-align:center; border:2px solid #bbf7d0;">
                    <div style="font-size:26px; font-weight:900; color:#16a34a;">${corr}</div>
                    <div style="font-size:12px; color:#15803d; font-weight:800; text-transform:uppercase;">Correct</div>
                </div>
                <div style="flex:1; background:#fef2f2; padding:15px; border-radius:12px; text-align:center; border:2px solid #fecaca;">
                    <div style="font-size:26px; font-weight:900; color:#dc2626;">${wrong}</div>
                    <div style="font-size:12px; color:#b91c1c; font-weight:800; text-transform:uppercase;">Wrong</div>
                </div>
                <div style="flex:1; background:#eff6ff; padding:15px; border-radius:12px; text-align:center; border:2px solid #bfdbfe;">
                    <div style="font-size:26px; font-weight:900; color:#2563eb;">${acc}%</div>
                    <div style="font-size:12px; color:#1d4ed8; font-weight:800; text-transform:uppercase;">Accuracy</div>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:800; color:var(--text-muted); margin-bottom:8px;">
                    <span><i class="fa-solid fa-bullseye"></i> Accuracy Rate</span>
                    <span style="color:#10b981;">${acc}%</span>
                </div>
                <div style="width:100%; height:16px; background:#e2e8f0; border-radius:8px; overflow:hidden;">
                    <div style="width:${acc}%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 1.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>

            <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:800; color:var(--text-muted); margin-bottom:8px;">
                    <span><i class="fa-solid fa-triangle-exclamation"></i> Error Rate (Wrong)</span>
                    <span style="color:#ef4444;">${errorRate}%</span>
                </div>
                <div style="width:100%; height:16px; background:#e2e8f0; border-radius:8px; overflow:hidden;">
                    <div style="width:${errorRate}%; height:100%; background:linear-gradient(90deg, #f59e0b, #ef4444); transition:width 1.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        </div>
    `;
}

// जब भी पेज लोड हो, ग्राफ खुद बन जाए
setTimeout(() => { showDualAnalytics(); }, 1500);

// हर बार जवाब देने पर ग्राफ लाइव अपडेट हो!
let originalRecordFunction = recordAnalytics;
recordAnalytics = function(isCorrect) {
    originalRecordFunction(isCorrect);
    showDualAnalytics(); // ग्राफ तुरंत हिलेगा
};
// ==========================================================================
// 🧠 SMART PRACTICE ENGINE (RESTORED FUNCTION)
// ==========================================================================
window.loadPracticePageQuestions = function(diff) {
    let listArea = document.getElementById('practiceQuestionArea');
    if(!listArea) return;

    let userTarget = currentUser ? (currentUser.designation || "LEVEL-3") : "LEVEL-3"; 
    
    let allowedLevels = ["ALL"]; 
    if (userTarget.includes("LEVEL-1")) { allowedLevels.push("LEVEL-1"); } 
    else if (userTarget.includes("LEVEL-2")) { allowedLevels.push("LEVEL-1", "LEVEL-2"); } 
    else { allowedLevels.push("LEVEL-1", "LEVEL-2", "LEVEL-3"); }

    // 1. सवालों को फिल्टर करना (Subject, Topic, Level, Exam)
    let filteredDB = questionsDB.filter(q => {
        let matchSubj = (q.subject === currSub);
        let matchTopic = (selectedChapter && q.topic === selectedChapter.name) || q.topic === selectedChapter;
        
        // अगर सवाल में Difficulty नहीं है, तो उसे 'Moderate' मान लेंगे
        let qDiff = q.difficulty ? q.difficulty.toLowerCase() : "moderate";
        let matchDiff = (diff === "All" || qDiff === diff.toLowerCase());
        
        let qExam = q.examTarget ? q.examTarget.toUpperCase() : "ALL";
        let matchExam = allowedLevels.includes(qExam);
        
        return matchSubj && matchTopic && matchDiff && matchExam;
    });

    // 2. 🔥 DYNAMIC LEVEL BUTTONS (ये बटन्स कभी क्रैश/डिलीट नहीं होंगे)
    let htmlContent = `
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; justify-content:center; background:#f8fafc; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
            <button onclick="changePracticeLevel('All', this)" style="padding:8px 20px; border-radius:8px; font-weight:800; cursor:pointer; transition:0.2s; background:${diff === 'All' ? 'var(--primary)' : 'var(--white)'}; color:${diff === 'All' ? 'white' : 'var(--text-muted)'}; border:2px solid ${diff === 'All' ? 'var(--primary)' : 'var(--border)'};">All Qs</button>
            <button onclick="changePracticeLevel('Easy', this)" style="padding:8px 20px; border-radius:8px; font-weight:800; cursor:pointer; transition:0.2s; background:${diff === 'Easy' ? 'var(--success)' : 'var(--white)'}; color:${diff === 'Easy' ? 'white' : 'var(--text-muted)'}; border:2px solid ${diff === 'Easy' ? 'var(--success)' : 'var(--border)'};">Easy</button>
            <button onclick="changePracticeLevel('Moderate', this)" style="padding:8px 20px; border-radius:8px; font-weight:800; cursor:pointer; transition:0.2s; background:${diff === 'Moderate' ? 'var(--warning)' : 'var(--white)'}; color:${diff === 'Moderate' ? 'white' : 'var(--text-muted)'}; border:2px solid ${diff === 'Moderate' ? 'var(--warning)' : 'var(--border)'};">Moderate</button>
            <button onclick="changePracticeLevel('Hard', this)" style="padding:8px 20px; border-radius:8px; font-weight:800; cursor:pointer; transition:0.2s; background:${diff === 'Hard' ? 'var(--danger)' : 'var(--white)'}; color:${diff === 'Hard' ? 'white' : 'var(--text-muted)'}; border:2px solid ${diff === 'Hard' ? 'var(--danger)' : 'var(--border)'};">Hard</button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h4 style="color:var(--primary); margin:0;">Target: ${userTarget} | Level: ${diff} (${filteredDB.length} Qs)</h4>
            <button class="btn-primary" style="background:var(--danger); width:auto; padding:8px 15px; margin:0;" onclick="if(typeof stopPracticeSession === 'function') stopPracticeSession(); else location.reload();">⏹ Stop Session</button>
        </div>
    `;

    // 3. अगर सवाल नहीं मिलते हैं
    if(filteredDB.length === 0) {
        listArea.innerHTML = htmlContent + `<div style="text-align:center; padding:40px 20px; border:2px dashed var(--border); border-radius:12px; color:var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size:40px; color:#cbd5e1; margin-bottom:15px;"></i>
            <h3>कोई सवाल नहीं मिला!</h3>
            <p>शायद '${diff}' लेवल के लिए अभी सवाल ऐड नहीं हुए हैं।</p>
        </div>`;
        return;
    }
    
    // 4. सवालों को रेंडर करना
    htmlContent += filteredDB.map((q,i) => `
        <div class="chapter-card" id="card-p-${q.id}" style="margin-bottom:25px; border-width:1px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <div>
                    <span style="background:var(--acc-light); color:var(--accent); padding:4px 10px; border-radius:6px; font-size:12px; font-weight:800;">[${q.examTarget || 'ALL'}]</span>
                    <span style="background:#f1f5f9; color:var(--text-muted); padding:4px 10px; border-radius:6px; font-size:12px; font-weight:800; margin-left:5px;">${q.difficulty || 'Moderate'}</span>
                </div>
                <span style="font-size:12px; color:var(--text-muted); font-weight:700;">Question ${i+1}</span>
            </div>
            <h3 style="margin-bottom:20px; line-height:1.6; color:var(--secondary);">${q.q_hi ? q.q_hi + '<br><span style="font-size:14px; color:var(--text-muted);">' + (q.q_en||'') + '</span>' : (q.q_en || 'Question text missing')}</h3>
            
            <button id="po-${q.id}-A" onclick="checkPracticeAns('${q.id}','A','${q.ans}')" class="mock-opt">A) ${q.a}</button>
            <button id="po-${q.id}-B" onclick="checkPracticeAns('${q.id}','B','${q.ans}')" class="mock-opt">B) ${q.b}</button>
            <button id="po-${q.id}-C" onclick="checkPracticeAns('${q.id}','C','${q.ans}')" class="mock-opt">C) ${q.c}</button>
            <button id="po-${q.id}-D" onclick="checkPracticeAns('${q.id}','D','${q.ans}')" class="mock-opt">D) ${q.d}</button>
            
            <button id="pbtn-${q.id}" onclick="document.getElementById('ptrick-${q.id}').style.display='block'; this.style.display='none';" style="display:none; margin-top:15px; padding:10px 15px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">View Solution</button>
            
            <div id="ptrick-${q.id}" style="display:none; margin-top:20px; padding:20px; background:#f0fdf4; border-left:4px solid var(--success); font-size:14px;">
                <h4 style="color:var(--success); margin-bottom:5px;">💡 Answer: ${q.ans}</h4>
                <b>Trick:</b> ${q.trick || 'No solution provided.'}
            </div>
        </div>
    `).join('');
    
    listArea.innerHTML = htmlContent;
}
// ==========================================================================
// 📚 SMART LIBRARY UPLOAD ENGINE (WITH MEDIUM BADGES)
// ==========================================================================
window.addLibraryData = function() {
    let cat = document.getElementById('libCategory').value;
    let medium = document.getElementById('libMedium') ? document.getElementById('libMedium').value : "Bilingual";
    let title = document.getElementById('libTitle').value.trim();
    let url = document.getElementById('libUrl').value.trim();

    if(!title || !url) {
        alert("⚠️ कृपया PDF का Title और Link दोनों डालें!");
        return;
    }

    // 🔥 Smart Hack: PDF के नाम के आगे अपने आप रंगीन बैज (Badge) लग जाएगा!
    let badgeColor = medium === 'Hindi' ? '#dc2626' : (medium === 'English' ? '#2563eb' : '#9333ea');
    let displayTitle = `${title} <span style="background:${badgeColor}; color:white; font-size:11px; padding:3px 8px; border-radius:12px; margin-left:10px; vertical-align:middle; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${medium}</span>`;

    let newItem = {
        id: "LIB_" + Date.now(),
        category: cat,
        medium: medium, // भविष्य में फ़िल्टर करने के काम आएगा
        title: displayTitle, 
        url: url,
        date: new Date().toLocaleDateString()
    };

    // डेटाबेस में सबसे ऊपर जोड़ें
    libraryDB.unshift(newItem);
    localStorage.setItem("ranniti_library_db", JSON.stringify(libraryDB));
    
    alert(`✅ ${title} (${medium} Medium) सफलतापूर्वक अपलोड हो गया!`);
    
    // बॉक्स खाली करें
    document.getElementById('libTitle').value = "";
    document.getElementById('libUrl').value = "";
    
    // लाइब्रेरी को तुरंत रिफ्रेश करें
    if(typeof renderLibrary === 'function') renderLibrary();
}
// ==========================================================================
// ⏱️ REAL-TIME MOCK TEST EXAM ENGINE (3-STEP FILTER)
// ==========================================================================
window.startFullMockTest = function() {
    let examName = document.getElementById('mockTargetExam').value;
    let subject = document.getElementById('mockTargetSubject').value;
    let reqMedium = document.getElementById('mockTargetMedium').value;

    // 🔥 MAGIC: बच्चे ने जो मीडियम चुना है, उसे सिस्टम को याद करवाओ!
    currentStudyMedium = reqMedium;

    // अगर एग्जाम नहीं चुना तो रोक दें
    if(!examName) {
        alert("⚠️ कृपया सबसे पहले Exam चुनें (जैसे SSC CGL)!");
        document.getElementById('mockTargetExam').focus();
        return;
    }

    let timeMin = 60; let qCount = 100;
    if(examName.includes("Railway")) { timeMin = 90; }
    if(subject !== "All") { timeMin = 20; qCount = 25; } 

    // 🔥 Filter Engine (Exam + Subject + Medium)
    let examQs = questionsDB.filter(q => {
        let matchExam = false;
        if(q.examLevel && q.examLevel.toUpperCase().includes(examName.toUpperCase())) matchExam = true;
        if(q.topic && q.topic.toUpperCase().includes(examName.toUpperCase())) matchExam = true;
        
        let matchSubj = (subject === "All") ? true : (q.category === subject);
        let matchMedium = (q.medium === reqMedium || q.medium === "Bilingual" || !q.medium);

        return matchExam && matchSubj && matchMedium;
    });

    if(examQs.length < 5) {
        alert(`⚠️ डेटाबेस में "${examName}" - "${subject}" (${reqMedium}) के लिए अभी पर्याप्त सवाल नहीं हैं। \n\n🛠️ Admin Info: सवाल अपलोड करते समय [EXAM]: ${examName} का टैग ज़रूर लगाएं!`);
        return;
    }

    alert(`🚀 MOCK TEST STARTING!\n\n📑 Exam: ${examName}\n📖 Subject: ${subject === 'All' ? 'Full Syllabus' : subject}\n⏱️ Time: ${timeMin} Min\n📚 Medium: ${reqMedium}\n🧩 Total Questions: ${examQs.length}\n\n(यहाँ तुम्हारा असली पेपर खुलेगा)`);
};
// ==========================================================================
// 🔖 SMART REVISION BOOK ENGINE (SAVE MOCK TEST QUESTIONS)
// ==========================================================================

window.addToRevision = function(qId) {
    if(!currentUser || currentUser.role === 'guest') { alert("⚠️ Please register to use Revision Book!"); return; }
    if(!currentUser.revisionBook) currentUser.revisionBook = [];
    if(!currentUser.revisionBook.includes(qId)) {
        currentUser.revisionBook.push(qId);
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        let idx = usersDB.findIndex(u => u.email === currentUser.email);
        if(idx > -1) { usersDB[idx] = currentUser; localStorage.setItem("ranniti_users_master", JSON.stringify(usersDB)); }
        alert("🔖 गज़ब! यह सवाल आपकी Revision Book में Save हो गया है।");
    } else {
        alert("⚠️ यह सवाल पहले से ही आपकी Revision Book में है!");
    }
}

window.openRevisionBook = function() {
    if(!currentUser || currentUser.role === 'guest') { alert("⚠️ Please register to view Revision Book!"); return; }
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active-panel'));
    
    let revPanel = document.getElementById('revisionPanel');
    if(!revPanel) {
        revPanel = document.createElement('div'); revPanel.id = 'revisionPanel'; revPanel.className = 'section-panel';
        document.querySelector('.dashboard-container') ? document.querySelector('.dashboard-container').appendChild(revPanel) : document.body.appendChild(revPanel);
    }
    revPanel.classList.add('active-panel');
    
    if(!currentUser.revisionBook || currentUser.revisionBook.length === 0) {
        revPanel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2><i class="fa-solid fa-book-bookmark" style="color:var(--warning);"></i> My Revision Book</h2>
                <button class="btn-primary" style="width:auto;" onclick="switchTab('material')">Back to Library</button>
            </div>
            <div style="text-align:center; padding:50px; background:var(--white); border:2px dashed var(--border); border-radius:12px; color:var(--text-muted); box-shadow:var(--card-shadow);">
                <i class="fa-solid fa-folder-open" style="font-size:50px; margin-bottom:15px; color:#cbd5e1;"></i>
                <h3 style="color:var(--secondary);">Revision Book is Empty</h3>
                <p style="margin-top:10px; font-weight:600;">Mock Test देते समय मुश्किल सवालों को 'Save' करें, वो यहाँ दिखेंगे!</p>
            </div>`;
        return;
    }

    let savedQs = questionsDB.filter(q => currentUser.revisionBook.includes(q.id));
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2><i class="fa-solid fa-book-bookmark" style="color:var(--warning);"></i> My Revision Book (${savedQs.length} Qs)</h2>
            <button class="btn-primary" style="width:auto;" onclick="switchTab('material')">Back to Library</button>
        </div>
    `;

    html += savedQs.map((q, i) => {
        // 🔥 SMART LANGUAGE FILTER: सिर्फ वही भाषा दिखाओ जो स्टूडेंट ने चुनी है
        let finalQText = "";
        if(currentStudyMedium === 'Hindi' && q.q_hi) { finalQText = q.q_hi; }
        else if(currentStudyMedium === 'English' && q.q_en) { finalQText = q.q_en; }
        else { finalQText = q.q_hi ? q.q_hi + '<br><span style="font-size:14px; color:var(--text-muted);">' + (q.q_en||'') + '</span>' : (q.q_en || ''); }

        return `
        <div style="background:var(--white); border:2px solid #fde68a; padding:25px; border-radius:12px; margin-bottom:20px; box-shadow:var(--card-shadow);">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                <span style="background:#fef3c7; color:#d97706; padding:6px 12px; border-radius:8px; font-size:13px; font-weight:800;">${q.examLevel || 'Exam'} ➔ ${q.topic}</span>
                <button onclick="removeFromRevision('${q.id}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;"><i class="fa-solid fa-trash"></i> Remove</button>
            </div>
            <h3 style="margin-bottom:20px; color:var(--secondary); font-size:16px; line-height:1.6;">${finalQText}</h3>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="padding:12px; background:${q.ans==='A'?'#d1fae5':'var(--bg-color)'}; border:2px solid ${q.ans==='A'?'var(--success)':'var(--border)'}; border-radius:8px; font-weight:bold; color:var(--secondary);">A) ${q.opts ? q.opts.A : (q.a || '')}</div>
                <div style="padding:12px; background:${q.ans==='B'?'#d1fae5':'var(--bg-color)'}; border:2px solid ${q.ans==='B'?'var(--success)':'var(--border)'}; border-radius:8px; font-weight:bold; color:var(--secondary);">B) ${q.opts ? q.opts.B : (q.b || '')}</div>
                <div style="padding:12px; background:${q.ans==='C'?'#d1fae5':'var(--bg-color)'}; border:2px solid ${q.ans==='C'?'var(--success)':'var(--border)'}; border-radius:8px; font-weight:bold; color:var(--secondary);">C) ${q.opts ? q.opts.C : (q.c || '')}</div>
                <div style="padding:12px; background:${q.ans==='D'?'#d1fae5':'var(--bg-color)'}; border:2px solid ${q.ans==='D'?'var(--success)':'var(--border)'}; border-radius:8px; font-weight:bold; color:var(--secondary);">D) ${q.opts ? q.opts.D : (q.d || '')}</div>
            </div>
            
            <div style="padding:20px; background:#f0fdf4; border-left:4px solid var(--success); border-radius:8px; font-size:15px;">
                <h4 style="color:var(--success); margin-bottom:8px;"><i class="fa-solid fa-lightbulb"></i> Correct Answer: ${q.ans}</h4>
                <b style="color:var(--secondary);">Trick / Solution:</b> <span style="color:var(--text-muted); font-weight:600;">${q.trick || 'Apply basic logic.'}</span>
            </div>
        </div>
        `;
    }).join('');
    
    revPanel.innerHTML = html;
}

window.removeFromRevision = function(qId) {
    if(confirm("क्या आप इसे Revision Book से हटाना चाहते हैं?")) {
        currentUser.revisionBook = currentUser.revisionBook.filter(id => id !== qId);
        localStorage.setItem("ranniti_active_user", JSON.stringify(currentUser));
        openRevisionBook();
    }
}

// 3. MOCK TEST UI OVERWRITE (TO ADD SAVE BUTTON & SMART LANGUAGE)
window.renderMockQuestion = function() {
    let area = document.getElementById('mockQuestionArea');
    if(currentMockIndex >= mockQuestions.length) { endMockTest(); return; }
    
    let q = mockQuestions[currentMockIndex];
    
    // 🔥 SMART LANGUAGE FILTER FOR LIVE EXAM
    let qText = "";
    if(currentStudyMedium === 'Hindi' && q.q_hi) { qText = q.q_hi; }
    else if(currentStudyMedium === 'English' && q.q_en) { qText = q.q_en; }
    else { qText = q.q_hi ? q.q_hi + '<br><span style="font-size:14px; color:gray;">' + (q.q_en||'') + '</span>' : (q.q_en || ''); }

    let html = `
        <div style="background:var(--white); padding:25px; border-radius:12px; border:2px solid var(--border); box-shadow:var(--card-shadow);">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-weight:800; color:var(--primary); background:var(--acc-light); padding:5px 15px; border-radius:20px;">Question ${currentMockIndex + 1} of ${mockQuestions.length}</span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="addToRevision('${q.id}')" style="background:#fef3c7; color:#d97706; border:2px solid #fde68a; padding:6px 15px; border-radius:20px; font-weight:800; cursor:pointer; transition:0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid fa-bookmark"></i> Save to Revision</button>
                    <span style="font-weight:800; color:var(--danger);"><i class="fa-solid fa-laptop-file"></i> TCS Engine</span>
                </div>
            </div>
            
            <h3 style="margin-bottom:25px; color:var(--secondary); line-height:1.6;">${qText}</h3>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                <button id="optA" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'A', '${q.ans}')">A) ${q.opts ? q.opts.A : q.a}</button>
                <button id="optB" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'B', '${q.ans}')">B) ${q.opts ? q.opts.B : q.b}</button>
                <button id="optC" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'C', '${q.ans}')">C) ${q.opts ? q.opts.C : q.c}</button>
                <button id="optD" class="mock-opt" onclick="submitMockAnswer('${q.id}', 'D', '${q.ans}')">D) ${q.opts ? q.opts.D : q.d}</button>
            </div>
        </div>
    `;
    area.innerHTML = html;
    document.querySelectorAll('.mock-opt').forEach(btn => {
        btn.style.padding = '15px 20px'; btn.style.textAlign = 'left';
        btn.style.border = '2px solid var(--border)'; btn.style.borderRadius = '8px';
        btn.style.background = 'var(--bg-color)'; btn.style.cursor = 'pointer';
        btn.style.fontWeight = '700'; btn.style.fontSize = '15px'; btn.style.transition = '0.2s';
        btn.style.color = 'var(--secondary)';
    });
}
// ==========================================================================
// 🗑️ DELETE JOB ALERT ENGINE (ADMIN PANEL)
// ==========================================================================
window.renderAdminJobs = function() {
    let list = document.getElementById('adminJobsList');
    if(!list) return;

    let realJobs = jobsDB.filter(j => j.id !== "JOB_DEMO");

    if(realJobs.length === 0) {
        list.innerHTML = `<p style="color:var(--text-muted); font-weight:600; text-align:center; padding:20px; border:2px dashed var(--border); border-radius:8px;">अभी कोई एक्टिव जॉब नहीं है।</p>`;
        return;
    }

    list.innerHTML = realJobs.map(j => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-color); padding:15px; border-radius:8px; margin-bottom:12px; border:1px solid var(--border);">
            <div>
                <strong style="color:var(--primary); font-size:16px;">${j.title}</strong>
                <div style="font-size:13px; color:var(--text-muted); margin-top:5px;"><i class="fa-solid fa-graduation-cap"></i> ${j.qual}</div>
            </div>
            <button onclick="deleteAdminJob('${j.id}')" style="background:var(--danger); color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; transition:0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
    `).join('');
};

window.deleteAdminJob = function(jobId) {
    if(confirm("⚠️ क्या आप सच में इस जॉब अलर्ट को डिलीट करना चाहते हैं? (यह स्टूडेंट्स के डैशबोर्ड से भी तुरंत हट जाएगा)")) {
        jobsDB = jobsDB.filter(j => j.id !== jobId);
        localStorage.setItem("ranniti_jobs_db", JSON.stringify(jobsDB));
        renderAdminJobs(); 
        if(typeof fetchLatestJobs === 'function') fetchLatestJobs(); 
    }
};

// Auto-update admin list when jobs change
let originalFetchLatestJobs = window.fetchLatestJobs;
window.fetchLatestJobs = function() {
    if(typeof originalFetchLatestJobs === 'function') originalFetchLatestJobs();
    setTimeout(renderAdminJobs, 500); 
};
// ==========================================================================
// 🏢 SMART JOB CENTER (GOVT & PRIVATE TABS)
// ==========================================================================
window.currentJobTab = 'Government';
window.currentGovtFilter = 'All';

window.fetchLatestJobs = function() {
    let panel = document.getElementById('jobsPanel');
    if(!panel) return;
    
    let realJobs = jobsDB.filter(j => j.id !== "JOB_DEMO");

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2><i class="fa-solid fa-briefcase" style="color:var(--primary);"></i> Job Center</h2>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button onclick="setJobTab('Government')" style="flex:1; padding:12px; border-radius:8px; font-size:15px; font-weight:800; cursor:pointer; transition:0.2s; border:2px solid ${currentJobTab === 'Government' ? 'var(--primary)' : 'var(--border)'}; background:${currentJobTab === 'Government' ? 'var(--acc-light)' : 'var(--white)'}; color:${currentJobTab === 'Government' ? 'var(--primary)' : 'var(--text-muted)'};">🏛️ Govt Jobs</button>
            <button onclick="setJobTab('Private')" style="flex:1; padding:12px; border-radius:8px; font-size:15px; font-weight:800; cursor:pointer; transition:0.2s; border:2px solid ${currentJobTab === 'Private' ? 'var(--primary)' : 'var(--border)'}; background:${currentJobTab === 'Private' ? 'var(--acc-light)' : 'var(--white)'}; color:${currentJobTab === 'Private' ? 'var(--primary)' : 'var(--text-muted)'};">🏢 Private Jobs</button>
        </div>
    `;

    // 🔥 Sub-tabs for Govt (All, Central, State)
    if(currentJobTab === 'Government') {
        html += `
            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button onclick="setGovtFilter('All')" style="padding:8px 20px; border-radius:20px; font-size:13px; font-weight:bold; border:none; cursor:pointer; background:${currentGovtFilter === 'All' ? 'var(--secondary)' : 'var(--bg-color)'}; color:${currentGovtFilter === 'All' ? 'white' : 'var(--secondary)'}; border:1px solid var(--border);">All Vacancy</button>
                <button onclick="setGovtFilter('Central')" style="padding:8px 20px; border-radius:20px; font-size:13px; font-weight:bold; border:none; cursor:pointer; background:${currentGovtFilter === 'Central' ? '#ea580c' : 'var(--bg-color)'}; color:${currentGovtFilter === 'Central' ? 'white' : 'var(--secondary)'}; border:1px solid var(--border);">🇮🇳 Central Jobs</button>
                <button onclick="setGovtFilter('State')" style="padding:8px 20px; border-radius:20px; font-size:13px; font-weight:bold; border:none; cursor:pointer; background:${currentGovtFilter === 'State' ? '#16a34a' : 'var(--bg-color)'}; color:${currentGovtFilter === 'State' ? 'white' : 'var(--secondary)'}; border:1px solid var(--border);">🚩 State Jobs</button>
            </div>
        `;
    }

    // 🔥 Filtering Logic
    let displayJobs = realJobs.filter(j => {
        let jType = j.jobType || 'Government';
        let jLevel = j.jobLevel || 'Central';
        
        if(currentJobTab === 'Private') {
            return jType === 'Private';
        } else {
            if(jType !== 'Government') return false;
            if(currentGovtFilter === 'All') return true;
            return jLevel === currentGovtFilter;
        }
    });

    if(displayJobs.length === 0) {
        html += `<div style="text-align:center; padding:50px; background:white; border-radius:12px; border:2px dashed var(--border); color:var(--text-muted); font-weight:600;"><i class="fa-solid fa-folder-open" style="font-size:40px; margin-bottom:10px; color:#cbd5e1;"></i><br>Abhi is category mein koi nayi job nahi hai.</div>`;
    } else {
        html += displayJobs.map(j => {
            let badge = j.jobType === 'Private' ? '<span style="background:#3b82f6; color:white; padding:4px 10px; border-radius:12px; font-size:11px; margin-left:10px;">Private</span>' : 
                       (j.jobLevel === 'State' ? '<span style="background:#16a34a; color:white; padding:4px 10px; border-radius:12px; font-size:11px; margin-left:10px;">State Govt</span>' : '<span style="background:#ea580c; color:white; padding:4px 10px; border-radius:12px; font-size:11px; margin-left:10px;">Central Govt</span>');

            return `
            <div style="background:white; border-radius:12px; padding:20px; margin-bottom:15px; border:1px solid var(--border); box-shadow:var(--card-shadow); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                <div>
                    <h3 style="margin-bottom:8px; color:var(--secondary); font-size:18px;">${j.title} ${badge}</h3>
                    <p style="color:var(--text-muted); font-size:14px; font-weight:600;"><i class="fa-solid fa-graduation-cap"></i> Eligibility: ${j.qual}</p>
                    <p style="color:var(--text-muted); font-size:12px; margin-top:5px;"><i class="fa-solid fa-calendar-days"></i> Posted: ${j.date}</p>
                </div>
                <a href="${j.link}" target="_blank" style="background:var(--primary); color:white; padding:12px 25px; border-radius:8px; text-decoration:none; font-weight:800; box-shadow:0 4px 6px rgba(79, 70, 229, 0.2); transition:0.2s;"><i class="fa-solid fa-paper-plane"></i> Apply Now</a>
            </div>`;
        }).join('');
    }

    panel.innerHTML = html;
};

window.setJobTab = function(tab) { currentJobTab = tab; fetchLatestJobs(); };
window.setGovtFilter = function(filter) { currentGovtFilter = filter; fetchLatestJobs(); };
// ==========================================
// 4. MAGIC LINK (PASSWORDLESS) LOGIN CODE
// ==========================================

// Firebase को बताना कि ईमेल से वापस कहाँ आना है
const actionCodeSettings = {
  url: 'https://rannitiportal.netlify.app', // यहाँ वेबसाइट का लाइव लिंक होना चाहिए
  handleCodeInApp: true,
};

// 4.1 लिंक भेजने वाला फंक्शन
async function sendMagicLink() {
    const email = document.getElementById('loginEmail').value;
    const loginBtn = document.getElementById('loginBtn');
    
    if(!email) {
        alert("पहले अपना ईमेल डालें!");
        return;
    }

    loginBtn.innerText = "लिंक भेजा जा रहा है... ⏳";
    loginBtn.disabled = true;

    try {
        await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
        // ईमेल को ब्राउज़र की मेमोरी में सेव करना (ताकि वापस आने पर पहचान सके)
        window.localStorage.setItem('emailForSignIn', email);
        alert("जादू हो गया! ✨ आपके ईमेल पर एक सुरक्षित लॉगिन लिंक भेज दिया गया है। अपना Gmail चेक करें!");
        loginBtn.innerText = "लिंक भेज दिया गया है 📧";
    } catch (error) {
        console.error("Error sending email link", error);
        alert("कुछ दिक्कत आ रही है: " + error.message);
        loginBtn.innerText = "फिर से लिंक भेजें 🚀";
        loginBtn.disabled = false;
    }
}

// 4.2 जब बच्चा लिंक पर क्लिक करके वापस वेबसाइट पर आये (चेक करना)
async function checkMagicLinkLogin() {
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
            // अगर बच्चा दूसरे डिवाइस या ब्राउज़र से लिंक खोलता है, तो फिर से ईमेल पूछना पड़ेगा
            email = window.prompt('सुरक्षा के लिए, कृपया अपना ईमेल दोबारा कन्फर्म करें:');
        }

        try {
            await firebase.auth().signInWithEmailLink(email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            alert("लॉगिन सफल रहा! 🎉 Ranniti Portal में आपका स्वागत है।");
            
            // लॉगिन पॉपअप को हटाना और डैशबोर्ड दिखाना
            document.getElementById('authOverlay').style.display = 'none'; 
            
        } catch (error) {
            console.error("Error signing in with email link", error);
            alert("लॉगिन लिंक पुराना हो गया है या गलत है। कृपया दोबारा नया लिंक मंगाएं।");
        }
    }
}

// ==========================================
// 5. PAGE LOAD HONE PAR SAB KUCH CHECK KARNA
// ==========================================
window.onload = function() {
    loadQuestions(); // सवाल मंगाने वाला आपका पुराना फंक्शन
    checkMagicLinkLogin(); // जैसे ही पेज खुले, चेक करे कि क्या बच्चा ईमेल लिंक से आया है
};
// ==========================================
// ADMIN DELETE CONSOLE LOGIC
// ==========================================

// 1. फ़िल्टर के हिसाब से सवाल खोजना
async function searchForDelete() {
    const subject = document.getElementById('delSubject').value;
    const topic = document.getElementById('delTopic').value.trim();
    const subtopic = document.getElementById('delSubtopic').value.trim();

    const listDiv = document.getElementById('adminDeleteList');
    listDiv.innerHTML = '<p style="text-align:center;">खोजा जा रहा है... ⏳</p>';

    try {
        let query = firebase.firestore().collection("questions");

        // जो-जो फ़िल्टर भरा गया है, उसे अप्लाई करना
        if (subject) query = query.where("subject", "==", subject);
        if (topic) query = query.where("topic", "==", topic);
        if (subtopic) query = query.where("subtopic", "==", subtopic);

        const snapshot = await query.get();

        if (snapshot.empty) {
            listDiv.innerHTML = '<p style="color:red; text-align:center;">इस फ़िल्टर से कोई सवाल नहीं मिला!</p>';
            return;
        }

        listDiv.innerHTML = ''; // पुराना डेटा साफ करें

        // मिले हुए सवालों की लिस्ट बनाना
        snapshot.forEach(doc => {
            const data = doc.data();
            const qBox = document.createElement('div');
            qBox.style.cssText = "border-bottom: 1px solid #eee; padding: 12px 10px; display: flex; justify-content: space-between; align-items: center; gap: 15px;";

            const textDiv = document.createElement('div');
            textDiv.innerHTML = `
                <div style="font-size:12px; color:gray; margin-bottom:5px;">
                    <strong>${data.subject}</strong> > ${data.topic} > ${data.subtopic}
                </div>
                <div style="font-size:14px; color:#333; line-height: 1.4;">
                    ${data.questionText.substring(0, 60)}...
                </div>
            `;

            const delBtn = document.createElement('button');
            delBtn.innerHTML = "<i class='fa-solid fa-trash'></i> Delete";
            delBtn.style.cssText = "background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; white-space: nowrap;";
            
            // सीधे Firebase ID से लिंक करना ताकि डिलीट फेल न हो
            delBtn.onclick = () => confirmAndDelete(doc.id); 

            qBox.appendChild(textDiv);
            qBox.appendChild(delBtn);
            listDiv.appendChild(qBox);
        });

    } catch (error) {
        console.error("Search Error: ", error);
        listDiv.innerHTML = '<p style="color:red; text-align:center;">डेटाबेस में खोजने में दिक्कत आई।</p>';
    }
}

// 2. पक्के तौर पर डिलीट करना
async function confirmAndDelete(docId) {
    if (!confirm("⚠️ क्या आप वाकई इस सवाल को हमेशा के लिए डिलीट करना चाहते हैं?")) {
        return;
    }

    try {
        await firebase.firestore().collection("questions").doc(docId).delete();
        alert("✅ सवाल सफलतापूर्वक डिलीट हो गया!");
        
        // डिलीट होने के बाद दोनों लिस्ट को रिफ्रेश करना
        searchForDelete(); 
        if (typeof loadQuestions === "function") {
            loadQuestions(); 
        }
    } catch (error) {
        console.error("Delete Error: ", error);
        alert("❌ डिलीट नहीं हो पा रहा है। कृपया चेक करें कि आपका इंटरनेट चालू है या नहीं।");
    }
}
