/* ==========================
   DOCUMENT TYPE DETECTOR
   ========================== */

async function extractTextFromFile(file) {
    const type = file.type;

    // ---------- PDF ----------
    if (type === "application/pdf") {
        const array = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: array }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(s => s.str).join(" ");
        }
        return text;
    }

    // ---------- IMAGE (OCR) ----------
    if (type.startsWith("image/")) {
        const result = await Tesseract.recognize(file, "eng");
        return result.data.text || "";
    }

    return "";
}

function detectDocumentType(text) {
    const lower = text.toLowerCase();

    const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]/i;

    let scores = {
        aadhaar: 0,
        pan: 0,
        property: 0,
        certificate: 0
    };

    if (aadhaarRegex.test(text)) scores.aadhaar += 2;
    if (lower.includes("uidai")) scores.aadhaar++;
    if (lower.includes("unique identification")) scores.aadhaar++;

    if (panRegex.test(text)) scores.pan += 2;
    if (lower.includes("income tax")) scores.pan++;

    if (lower.includes("sale deed") || lower.includes("khata") || lower.includes("registration no"))
        scores.property += 2;

    if (lower.includes("certificate") || lower.includes("university") || lower.includes("board"))
        scores.certificate += 2;

    let best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (best[1] === 0) return "unknown";
    return best[0];
}

'use strict';

/* ------------------ CONFIG ------------------ */
const SUPABASE_URL = "https://imqmwrvvesihyxnmxkjt.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcW13cnZ2ZXNpaHl4bm14a2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDgwNTMsImV4cCI6MjA3ODYyNDA1M30.UqGdf4TH2BE4vpuultt-ZLgJnMyrxx7IOYwvL0__gng";

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkEXIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w";

/* --------------------- STATE -------------------- */
let currentDocId = null;
const sessionCache = {};

/* --------------------- HELPERS -------------------- */
async function getCurrentUser() {
    const { data } = await supa.auth.getUser();
    return data?.user || null;
}

function ensureLoggedInPrompt() {
    openAuthPanel("login");
}

/* -------------------- DOM READY -------------------- */
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize all elements
    const getStartedBtn = document.getElementById("get-started-btn");
    const heroSection = document.getElementById("hero-section");
    const authOverlay = document.getElementById("auth-overlay");
    const authPanel = document.getElementById("auth-panel");
    const authTitle = document.getElementById("auth-title");
    const authClose = document.getElementById("auth-close");
    const authForm = document.getElementById("auth-form");
    const fileInput = document.getElementById("file-input");
    const addFileCard = document.getElementById("add-file-card");

    // ========== GET STARTED BUTTON ==========
    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const user = await getCurrentUser();
            
            if (!user) {
                // Show login panel
                authOverlay.classList.remove("hidden");
                authOverlay.classList.add("show");
                authPanel.classList.remove("hidden");
                authPanel.classList.add("show");
                authTitle.textContent = "Login";
                document.getElementById("confirm-wrapper").style.display = "none";
                
                // Update auth switch text
                document.getElementById("auth-switch").innerHTML =
                    `Don't have an account? <span id="switch-to-signup" style="cursor: pointer; color: #3B82F6; font-weight: 600;">Sign Up</span>`;
                
                // Add listener for switch
                document.getElementById("switch-to-signup")?.addEventListener("click", (e) => {
                    e.preventDefault();
                    openAuthPanel("signup");
                });
            } else {
                // User already logged in - lift curtain
                heroSection.classList.add("lifted");
                setTimeout(() => {
                    document.getElementById("documents").scrollIntoView({ behavior: "smooth" });
                }, 600);
            }
        });
    }

    // ========== AUTH CLOSE BUTTON ==========
    if (authClose) {
        authClose.addEventListener("click", () => {
            authOverlay.classList.remove("show");
            authPanel.classList.remove("show");
            setTimeout(() => {
                authOverlay.classList.add("hidden");
                authPanel.classList.add("hidden");
            }, 300);
        });
    }

    // ========== AUTH FORM SUBMISSION ==========
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("auth-email").value.trim();
            const password = document.getElementById("auth-password").value.trim();
            const isSignup = authTitle.textContent === "Sign Up";

            if (!email.includes("@")) {
                alert("Enter a valid email");
                return;
            }

            if (isSignup) {
                const passwordConfirm = document.getElementById("auth-password-confirm").value.trim();
                if (password !== passwordConfirm) {
                    alert("Passwords do not match!");
                    return;
                }
                await signupUser(email, password);
            } else {
                await loginUser(email, password);
            }

            // Clear form
            authForm.reset();

            // Close panel and lift curtain
            authOverlay.classList.remove("show");
            authPanel.classList.remove("show");
            setTimeout(() => {
                authOverlay.classList.add("hidden");
                authPanel.classList.add("hidden");
                heroSection.classList.add("lifted");
                setTimeout(() => {
                    document.getElementById("documents").scrollIntoView({ behavior: "smooth" });
                }, 600);
            }, 300);
        });
    }

    // ========== ADD FILE CARD ==========
    if (addFileCard) {
        addFileCard.addEventListener("click", async () => {
            const user = await getCurrentUser();
            if (!user) {
                ensureLoggedInPrompt();
            } else {
                fileInput.click();
            }
        });
    }

    // ========== FILE INPUT ==========
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            handleFiles(e.target.files);
            fileInput.value = "";
        });
    }

    // ========== DOCUMENT CARD CLICK ==========
    document.addEventListener("click", async (e) => {
        const card = e.target.closest(".document-card[data-doc-id]");
        if (!card) return;

        const docId = card.getAttribute("data-doc-id");
        const user = await getCurrentUser();
        if (!user) return ensureLoggedInPrompt();

        if (sessionCache[docId]) {
            if (!confirm("Replace existing file?")) return;
        }

        currentDocId = docId;
        fileInput.click();
    });

    // ========== LOAD INITIAL UI ==========
    for (const card of document.querySelectorAll(".document-card[data-doc-id]")) {
        await updateDocumentCard(card.getAttribute("data-doc-id"));
    }

    await updateUploadedDocumentsList();
    await refreshAuthUI();
});

/* ---------------------- AUTH ---------------------- */
async function signupUser(email, password) {
    const { error } = await supa.auth.signUp({ email, password });
    if (error) return alert(error.message);

    await refreshAuthUI();
    await updateUploadedDocumentsList();
}

async function loginUser(email, password) {
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);

    await refreshAuthUI();
    await updateUploadedDocumentsList();
}

async function logoutUser() {
    await supa.auth.signOut();
    for (const key in sessionCache) delete sessionCache[key];
    await refreshAuthUI();
    await updateUploadedDocumentsList();
}

async function refreshAuthUI() {
    const loginBtn = document.querySelector(".btn-login");
    const signupBtn = document.querySelector(".btn-signup");
    const user = await getCurrentUser();

    if (user) {
        loginBtn.textContent = "Welcome";
        loginBtn.disabled = true;

        signupBtn.textContent = "Logout";
        signupBtn.onclick = logoutUser;
        signupBtn.style.backgroundColor = "#dc3545";
    } else {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        loginBtn.onclick = () => openAuthPanel("login");

        signupBtn.textContent = "Sign Up";
        signupBtn.onclick = () => openAuthPanel("signup");
        signupBtn.style.backgroundColor = "";
    }
}

/* -------------------- FILE HANDLING -------------------- */

function handleFiles(files) {
    if (!files.length) return;
    if (!currentDocId) return alert("Select a section first.");
    uploadToIPFS(files[0], currentDocId);
    currentDocId = null;
}

async function uploadToIPFS(file, docId) {
    const user = await getCurrentUser();
    if (!user) return ensureLoggedInPrompt();

    const sectionId = parseInt(docId);

    // ---- Malware scan (block if suspicious) ----
    const malwareWarning = await basicMalwareScan(file);
    if (malwareWarning) {
        alert("Upload blocked: " + malwareWarning);
        return;
    }

    // ---- Document type detection (block if mismatch) ----
    const text = await extractTextFromFile(file);
    const detected = detectDocumentType(text);

    // Map section numbers to expected types
    const sectionMap = {
        1: "aadhaar",
        2: "pan",
        3: "property",
        4: "certificate"
    };

    const expected = sectionMap[sectionId];

    // If document type is unknown → BLOCK upload
    if (detected === "unknown") {
        alert("❌ This file does not look like a valid Aadhaar/PAN/Property/Certificate document.\nUpload blocked.");
        return;
    }

    // If detected type does NOT match the section → BLOCK upload
    if (expected && detected !== expected) {
        alert(`❌ Wrong document type uploaded!\n\nYou selected: ${expected.toUpperCase()}\nBut this file looks like: ${detected.toUpperCase()}\n\nUpload BLOCKED.`);
        return;
    }

    // Upload to Pinata
    const form = new FormData();
    form.append("file", file);
    form.append("pinataMetadata",
        JSON.stringify({ name: file.name, keyvalues: { section: sectionId.toString() } })
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        body: form
    });

    if (!res.ok) return alert("IPFS upload failed.");

    const data = await res.json();
    const cid = data.IpfsHash;
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    // Save to Supabase
    const { data: row, error } = await supa
        .from("documents")
        .insert([{ user_id: user.id, section_id: sectionId, name: file.name, cid, ipfs_url: url }])
        .select();

    if (error) return alert(error.message);

    sessionCache[docId] = row[0];

    await updateDocumentCard(docId);
    await updateUploadedDocumentsList();
}

/* -------------------- UI UPDATES -------------------- */

async function updateDocumentCard(docId) {
    const card = document.querySelector(`[data-doc-id="${docId}"]`);
    const label = card.querySelector(".doc-status");

    const user = await getCurrentUser();
    if (!user) {
        label.textContent = "Login required";
        label.style.color = "#999";
        return;
    }

    let doc = sessionCache[docId];

    if (!doc) {
        const { data } = await supa
            .from("documents")
            .select("*")
            .eq("user_id", user.id)
            .eq("section_id", parseInt(docId))
            .order("uploaded_at", { ascending: false })
            .limit(1);

        if (data?.length) {
            doc = data[0];
            sessionCache[docId] = doc;
        }
    }

    label.textContent = doc ? `${doc.name} (IPFS)` : "No file uploaded";
}

async function updateUploadedDocumentsList() {
    const container = document.getElementById("uploaded-documents-list");
    const user = await getCurrentUser();

    if (!user) {
        container.innerHTML = "<p>Login to see your documents.</p>";
        return;
    }

    const { data, error } = await supa
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

    if (error) {
        container.innerHTML = "<p>Error loading documents</p>";
        return;
    }

    if (!data.length) {
        container.innerHTML = "<p>No documents uploaded yet.</p>";
        return;
    }

    container.innerHTML = "";
    for (const item of data) {
        const row = document.createElement("div");
        row.classList.add("doc-row");

        row.innerHTML = `
            <div class="doc-info">${escapeHtml(item.name)}</div>
            <div class="doc-actions">
                <a class="view-btn" href="${item.ipfs_url}" target="_blank">View</a>
                <a class="download-btn" href="${item.ipfs_url}" download="${item.name}">Download</a>
                <button class="delete-btn" onclick="deleteDocumentDB('${item.id}','${item.section_id}')">Delete</button>
            </div>
        `;
        container.appendChild(row);
    }
}

/* -------------------- DELETE -------------------- */

async function deleteDocumentDB(id, docId) {
    await supa.from("documents").delete().eq("id", id);
    delete sessionCache[docId];

    await updateDocumentCard(docId);
    await updateUploadedDocumentsList();
}

/* -------------------- AUTH MODAL -------------------- */

const authOverlay = document.getElementById("auth-overlay");
const authPanel = document.getElementById("auth-panel");
const authTitle = document.getElementById("auth-title");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authPasswordConfirm = document.getElementById("auth-password-confirm");
const confirmWrapper = document.getElementById("confirm-wrapper");
const authClose = document.getElementById("auth-close");

let authMode = "login";

function openAuthPanel(mode) {
    authMode = mode;

    if (mode === "login") {
        authTitle.textContent = "Login";
        confirmWrapper.style.display = "none";
        document.getElementById("auth-switch").innerHTML =
            `Don't have an account? <span id="switch-to-signup">Sign Up</span>`;
    } else {
        authTitle.textContent = "Sign Up";
        confirmWrapper.style.display = "block";
        document.getElementById("auth-switch").innerHTML =
            `Already have an account? <span id="switch-to-login">Login</span>`;
    }

    authOverlay.classList.add("show");
    authPanel.classList.add("show");

    setTimeout(() => {
        document.getElementById("switch-to-signup")?.addEventListener("click", () => openAuthPanel("signup"));
        document.getElementById("switch-to-login")?.addEventListener("click", () => openAuthPanel("login"));
    }, 10);
}
async function basicMalwareScan(file) {
    const filename = file.name.toLowerCase();

    // RULE 1: Double extension (super common malware trick)
    if (filename.match(/\.(pdf|jpg|png|docx)\.(exe|js|sh|bat)$/)) {
        return "Suspicious double-extension file.";
    }

    // RULE 2: Read file as text or binary
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    // RULE 3: EXE signatures
    if (text.includes("This program cannot be run in DOS mode") || 
        (bytes[0] === 0x4D && bytes[1] === 0x5A)) {
        return "Executable content detected inside the file.";
    }

    // RULE 4: <script> tag detection
    const scriptPatterns = [
        "<script",
        "javascript:",
        "onerror=",
        "eval(",
        "function(",
        "atob(",
        "iframe"
    ];
    for (const pattern of scriptPatterns) {
        if (text.toLowerCase().includes(pattern)) {
            return `Script code detected (${pattern}).`;
        }
    }

    // RULE 5: PDF JavaScript detection
    if (filename.endsWith(".pdf")) {
        const pdfJSMarkers = ["/JS", "/JavaScript", "/OpenAction", "/AA"];
        for (const m of pdfJSMarkers) {
            if (text.includes(m)) {
                return "PDF contains JavaScript actions (dangerous).";
            }
        }
    }

    // RULE 6: DOCX macro detection (file is actually a ZIP)
    if (filename.endsWith(".docx")) {
        // DOCX is a ZIP → look for vbaProject.bin signature
        const zipText = text.toLowerCase();
        if (zipText.includes("vbaproject.bin")) {
            return "Document contains macros (dangerous).";
        }
    }

    // RULE 7: Suspicious long Base64 payload
    if (text.match(/[A-Za-z0-9+/]{400,}={0,2}/)) {
        return "Long encoded payload detected (suspicious).";
    }

    return null; // safe
}
function closeAuthPanel() {
    authOverlay.classList.remove("show");
    authPanel.classList.remove("show");
}

authClose.addEventListener("click", closeAuthPanel);
authOverlay.addEventListener("click", closeAuthPanel);

document.querySelector(".btn-login").onclick = () => openAuthPanel("login");
document.querySelector(".btn-signup").onclick = () => openAuthPanel("signup");

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email.includes("@") || !email.includes(".")) {
        alert("Enter a valid email");
        return;
    }

    if (authMode === "signup") {
        const confirmPass = authPasswordConfirm.value.trim();
        if (password !== confirmPass) {
            alert("Passwords do not match");
            return;
        }
        await signupUser(email, password);
    } else {
        await loginUser(email, password);
    }

    closeAuthPanel();
});

/* -------------------- UTILS -------------------- */
function escapeHtml(str = "") {
    return String(str)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* -------------------- GUIDED FLOW -------------------- */
function liftCurtainAndGuide() {
    const heroSection = document.getElementById("hero-section");
    const header = document.querySelector(".header");
    
    // Lift the curtain
    heroSection.classList.add("lifted");
    header.style.display = "block";
    
    // Show guided tour
    setTimeout(() => {
        showGuidedTour();
    }, 600);
}

function showGuidedTour() {
    // Create tour overlay
    const tourOverlay = document.createElement("div");
    tourOverlay.id = "tour-overlay";
    tourOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.7);
        z-index: 900;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    const tourBox = document.createElement("div");
    tourBox.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.5s ease-out;
    `;

    tourBox.innerHTML = `
        <h2 style="color: #0F172A; margin-bottom: 20px; font-size: 28px;">Welcome to DocVault! 🎉</h2>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.8;">
            Let's take a quick tour of your secure document storage.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="tour-home" style="
                background-color: #3B82F6;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            ">Start Tour</button>
            <button id="tour-skip" style="
                background-color: #E2E8F0;
                color: #333;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            ">Skip</button>
        </div>
    `;

    tourOverlay.appendChild(tourBox);
    document.body.appendChild(tourOverlay);

    document.getElementById("tour-home").addEventListener("click", () => {
        tourOverlay.remove();
        guideTourStep(1);
    });

    document.getElementById("tour-skip").addEventListener("click", () => {
        tourOverlay.remove();
    });
}

function guideTourStep(step) {
    const tourOverlay = document.createElement("div");
    tourOverlay.id = "step-overlay";
    tourOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.7);
        z-index: 900;
        pointer-events: none;
    `;
    document.body.appendChild(tourOverlay);

    const steps = [
        {
            title: "📍 You're Home!",
            description: "This is your dashboard where you'll manage all your documents.",
            target: "#documents",
            nextText: "Go to Documents →"
        },
        {
            title: "📂 Your Documents",
            description: "Upload and organize your important documents here. Each section is for a specific document type.",
            target: "#documents h2",
            nextText: "Learn More →"
        },
        {
            title: "ℹ️ About DocVault",
            description: "Discover more about our mission and how we protect your documents securely.",
            target: "#about",
            nextText: "View About ↓"
        },
        {
            title: "✅ All Set!",
            description: "You're ready to start uploading and managing your documents securely.",
            target: null,
            nextText: "Get Started"
        }
    ];

    if (step > steps.length) {
        tourOverlay.remove();
        return;
    }

    const currentStep = steps[step - 1];
    const targetElement = currentStep.target ? document.querySelector(currentStep.target) : null;

    const tourBox = document.createElement("div");
    tourBox.style.cssText = `
        position: fixed;
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 901;
        animation: slideUp 0.5s ease-out;
    `;

    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        tourBox.style.top = (rect.bottom + 20) + "px";
        tourBox.style.left = (rect.left) + "px";

        // Highlight target
        const highlightBox = document.createElement("div");
        highlightBox.style.cssText = `
            position: fixed;
            top: ${rect.top - 10}px;
            left: ${rect.left - 10}px;
            width: ${rect.width + 20}px;
            height: ${rect.height + 20}px;
            border: 2px solid #3B82F6;
            border-radius: 8px;
            box-shadow: 0 0 0 2000px rgba(15, 23, 42, 0.5);
            z-index: 899;
            pointer-events: none;
        `;
        document.body.appendChild(highlightBox);
    } else {
        tourBox.style.top = "50%";
        tourBox.style.left = "50%";
        tourBox.style.transform = "translate(-50%, -50%)";
    }

    tourBox.innerHTML = `
        <h3 style="color: #0F172A; margin-bottom: 12px; font-size: 20px;">${currentStep.title}</h3>
        <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">${currentStep.description}</p>
        <div style="display: flex; gap: 12px;">
            <button id="tour-next" style="
                background-color: #3B82F6;
                color: white;
                border: none;
                padding: 10px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                flex: 1;
            ">${currentStep.nextText}</button>
            <button id="tour-skip-step" style="
                background-color: #E2E8F0;
                color: #333;
                border: none;
                padding: 10px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">Skip</button>
        </div>
    `;

    document.body.appendChild(tourBox);

    document.getElementById("tour-next").addEventListener("click", () => {
        tourOverlay.remove();
        tourBox.remove();
        document.querySelectorAll("[id^='step-overlay'], div[style*='position: fixed'][style*='border: 2px solid']").forEach(el => el.remove());

        if (step < steps.length) {
            if (step === 1) document.getElementById("documents").scrollIntoView({ behavior: "smooth" });
            if (step === 2) document.getElementById("about").scrollIntoView({ behavior: "smooth" });
        }

        guideTourStep(step + 1);
    });

    document.getElementById("tour-skip-step").addEventListener("click", () => {
        tourOverlay.remove();
        tourBox.remove();
        document.querySelectorAll("[id^='step-overlay'], div[style*='position: fixed'][style*='border: 2px solid']").forEach(el => el.remove());
    });
}
