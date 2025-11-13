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

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w";

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
    const fileInput = document.getElementById("file-input");
    const getStartedBtn = document.querySelector(".btn-primary");

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            handleFiles(e.target.files);
            fileInput.value = "";
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", () => {
            document.querySelector(".documents")?.scrollIntoView({ behavior: "smooth" });
        });
    }

    // Card click
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
        document.getElementById("file-input").click();
    });

    // Load initial UI
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
