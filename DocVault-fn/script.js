'use strict';

/*
  NOTE:
  - Do NOT embed secret keys (Pinata JWT) in client-side code for production.
  - Replace client uploads with a server-side endpoint that signs/forwards requests,
    or set PINATA_JWT here only for local testing (not recommended).
*/

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w';

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.querySelector('.upload-area');
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    const getStartedBtn = document.querySelector('.btn-primary');

    // File upload handling
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = '#f0f5ff';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.backgroundColor = '#ffffff';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = '#ffffff';
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    // Button event listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('Login functionality coming soon!');
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            alert('Sign up functionality coming soon!');
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Delegate clicks for document cards and view buttons so dynamically added cards work
    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.btn-secondary');
        if (viewBtn) {
            // View button clicked (allows default link behavior to continue)
            e.stopPropagation();
            const card = viewBtn.closest('.document-card');
            const docName = card ? card.querySelector('h3')?.textContent : '';
            alert(`Viewing document: ${docName}`);
            return;
        }

        const card = e.target.closest('.document-card');
        if (card) {
            // Card clicked (but not the view button)
            const docName = card.querySelector('h3')?.textContent;
            alert(`Opening: ${docName}`);
        }
    });
});

/* Handle file uploads */
function handleFiles(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        if (!PINATA_JWT) {
            alert('Uploading from the client is disabled. Configure a server endpoint to handle uploads securely.');
            return;
        }

        uploadFileToIPFS(file);
    });
}

/* Upload file to IPFS via Pinata */
async function uploadFileToIPFS(file) {
    const data = new FormData();
    data.append('file', file);

    const metadata = {
        name: file.name,
        keyvalues: { uploadedAt: new Date().toISOString() }
    };
    data.append('pinataMetadata', JSON.stringify(metadata));

    try {
        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w`
            },
            body: data
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Pinata error ${res.status}: ${text}`);
        }

        const result = await res.json();
        console.log('Uploaded to IPFS:', result);

        const cid = result.IpfsHash;
        alert(`Upload successful! CID: ${cid}`);

        addDocumentToGrid(file.name, cid);
    } catch (err) {
        console.error(err);
        alert('Upload failed: ' + (err && err.message ? err.message : err));
    }
}

/* Add uploaded document to grid */
function addDocumentToGrid(title, cid) {
    const grid = document.querySelector('.document-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'document-card';

    const uploadDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    card.innerHTML = `
        <div class="doc-icon">📄</div>
        <h3>${escapeHtml(title)}</h3>
        <p>Last updated: ${uploadDate}</p>
        <a href="https://ipfs.io/ipfs/${encodeURIComponent(cid)}" target="_blank" rel="noopener" class="btn-secondary">View</a>
    `;

    // Prepend and existing delegation will handle click behavior
    grid.prepend(card);
}

/* Basic HTML escaping */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}