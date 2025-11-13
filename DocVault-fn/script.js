'use strict';

/*
  NOTE:
  - Do NOT embed secret keys (Pinata JWT) in client-side code for production.
  - Replace client uploads with a server-side endpoint that signs/forwards requests,
    or set PINATA_JWT here only for local testing (not recommended).
*/

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w';

// Document storage object - stores file data for each document (kept for mapping)
const documentStorage = {
    1: { files: [] }, // Aadhaar
    2: { files: [] }, // Pan
    3: { files: [] }, // Property
    4: { files: [] }  // Certificates
};

// centralized list of all uploaded files
const generalUploads = [];

// Currently selected document ID for upload
let currentDocId = null;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    const getStartedBtn = document.querySelector('.btn-primary');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = '';
        });
    }

    if (loginBtn) loginBtn.addEventListener('click', () => alert('Login functionality coming soon!'));
    if (signupBtn) signupBtn.addEventListener('click', () => alert('Sign up functionality coming soon!'));
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => {
        const uploadSection = document.querySelector('.documents');
        if (uploadSection) uploadSection.scrollIntoView({ behavior: 'smooth' });
    });

    // click handling: section click => open file picker for that section
    document.addEventListener('click', (e) => {
        // card-level view/delete from central list remain handled separately
        const card = e.target.closest('.document-card[data-doc-id]');
        if (card) {
            const docId = card.getAttribute('data-doc-id');
            // if file exists, ask to replace
            if (documentStorage[docId].files.length > 0) {
                if (!confirm('This section already has an uploaded file. Replace it?')) {
                    return;
                }
            }
            currentDocId = docId;
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.click();
        }

        const viewBtn = e.target.closest('.view-btn');
        if (viewBtn) {
            const cardView = viewBtn.closest('.document-card');
            if (cardView) {
                const docId = cardView.getAttribute('data-doc-id');
                viewDocument(docId);
            }
        }

        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const cardDelete = deleteBtn.closest('.document-card');
            if (cardDelete) {
                const docId = cardDelete.getAttribute('data-doc-id');
                deleteDocument(docId);
            }
        }
    });

    // initialize UI
    document.querySelectorAll('.document-card[data-doc-id]').forEach(card => {
        const docId = card.getAttribute('data-doc-id');
        updateDocumentCard(docId);
    });
    updateUploadedDocumentsList();
});

/* Handle file selection for a section */
function handleFiles(files) {
    if (!files || files.length === 0) return;

    if (!currentDocId) {
        alert('Please click a document section (Aadhaar / Pan / ...) to upload.');
        return;
    }

    const file = files[0];
    uploadLocalFile(file, currentDocId);
    currentDocId = null;
}

/* Local upload (no external upload). Store file under section and central list. */
function uploadLocalFile(file, docId) {
    // revoke previous objectURL if replacing
    const prev = (documentStorage[docId].files[0] || null);
    if (prev && prev.objectUrl) {
        URL.revokeObjectURL(prev.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const fileObj = {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toLocaleString(),
        objectUrl,
        section: docId,
        id: Date.now() + Math.random().toString(36).slice(2,8)
    };

    // replace section file (keep single file per section)
    documentStorage[docId].files = [fileObj];

    // remove any previous central entry for this section (so central list shows latest)
    for (let i = generalUploads.length - 1; i >= 0; i--) {
        if (generalUploads[i].section === docId) generalUploads.splice(i, 1);
    }
    generalUploads.push(fileObj);

    updateDocumentCard(docId);
    updateUploadedDocumentsList();
}

/* Update document card UI - show green tick when file exists */
function updateDocumentCard(docId) {
    const card = document.querySelector(`[data-doc-id="${docId}"]`);
    if (!card) return;

    const statusText = card.querySelector('.doc-status');

    const filesCount = documentStorage[docId].files.length;
    let tick = card.querySelector('.uploaded-tick');

    if (filesCount > 0) {
        const doc = documentStorage[docId].files[0];
        statusText.textContent = ` ${doc.name}`;
        statusText.style.color = '#333';

        if (!tick) {
            tick = document.createElement('div');
            tick.className = 'uploaded-tick';
            tick.style.display = 'flex';
            tick.style.alignItems = 'center';
            tick.style.gap = '8px';
            tick.style.marginTop = '8px';
            tick.style.color = '#28a745';
            tick.style.fontSize = '0.95em';
            tick.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17l-5-5" stroke="#28a745" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Stored under this section</span>
            `;
            statusText.insertAdjacentElement('afterend', tick);
        } else {
            tick.style.display = 'flex';
        }
        card.style.cursor = 'pointer';
    } else {
        statusText.textContent = 'No file uploaded';
        statusText.style.color = '#999';
        if (tick) tick.remove();
        card.style.cursor = 'pointer';
    }
}

/* Centralized uploaded documents list update */
function updateUploadedDocumentsList() {
    const container = document.getElementById('uploaded-documents-list');
    if (!container) return;

    container.innerHTML = '';

    if (generalUploads.length === 0) {
        container.innerHTML = `<p class="empty-note" style="color:#666;">No uploaded documents yet.</p>`;
        return;
    }

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';

    const docNames = { 1: 'Aadhaar Card', 2: 'Pan Card', 3: 'Property Deed', 4: 'Certificates' };

    // show newest first
    generalUploads.slice().reverse().forEach(item => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '10px';
        row.style.border = '1px solid #eee';
        row.style.borderRadius = '6px';
        row.style.background = '#fff';

        const info = document.createElement('div');
        info.innerHTML = `<div style="font-weight:600">${escapeHtml(item.name)}</div>
                          <div style="font-size:0.85em;color:#666">${docNames[item.section] || 'General'} • ${item.uploadDate}</div>`;

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';

        const view = document.createElement('a');
        view.textContent = 'View';
        view.href = item.objectUrl;
        view.target = '_blank';
        view.rel = 'noopener';
        view.style.padding = '6px 10px';
        view.style.background = '#007bff';
        view.style.color = '#fff';
        view.style.borderRadius = '4px';
        view.style.textDecoration = 'none';

        const download = document.createElement('a');
        download.textContent = 'Download';
        download.href = item.objectUrl;
        download.download = item.name;
        download.style.padding = '6px 10px';
        download.style.background = '#28a745';
        download.style.color = '#fff';
        download.style.borderRadius = '4px';
        download.style.textDecoration = 'none';

        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.style.padding = '6px 10px';
        del.style.background = '#dc3545';
        del.style.color = '#fff';
        del.style.border = 'none';
        del.style.borderRadius = '4px';
        del.style.cursor = 'pointer';

        del.addEventListener('click', () => {
            if (!confirm(`Delete "${item.name}"?`)) return;
            deleteUploaded(item.id, item.section);
        });

        actions.appendChild(view);
        actions.appendChild(download);
        actions.appendChild(del);

        row.appendChild(info);
        row.appendChild(actions);
        list.appendChild(row);
    });

    container.appendChild(list);
}

/* Delete uploaded item from central list (and from its section mapping if any) */
function deleteUploaded(id, section = null) {
    for (let i = generalUploads.length - 1; i >= 0; i--) {
        if (generalUploads[i].id === id) {
            // revoke object URL
            if (generalUploads[i].objectUrl) URL.revokeObjectURL(generalUploads[i].objectUrl);
            generalUploads.splice(i, 1);
        }
    }

    if (section) {
        const files = documentStorage[section].files;
        for (let i = files.length - 1; i >= 0; i--) {
            if (files[i].id === id) {
                if (files[i].objectUrl) URL.revokeObjectURL(files[i].objectUrl);
                files.splice(i, 1);
            }
        }
        updateDocumentCard(section);
    }

    updateUploadedDocumentsList();
}

/* Delete mapping for a section (clears mapping and central list entries for that section) */
function deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete documents for this section?')) return;

    // remove central entries for this section
    for (let i = generalUploads.length - 1; i >= 0; i--) {
        if (generalUploads[i].section === docId) {
            if (generalUploads[i].objectUrl) URL.revokeObjectURL(generalUploads[i].objectUrl);
            generalUploads.splice(i, 1);
        }
    }
    // clear section storage
    const files = documentStorage[docId].files;
    for (let i = files.length - 1; i >= 0; i--) {
        if (files[i].objectUrl) URL.revokeObjectURL(files[i].objectUrl);
        files.splice(i, 1);
    }
    updateDocumentCard(docId);
    updateUploadedDocumentsList();
}

/* View document from section (opens first file for the section) */
function viewDocument(docId) {
    const files = documentStorage[docId].files;
    if (!files || files.length === 0) {
        alert('No files in this folder');
        return;
    }
    const doc = files[0];
    window.open(doc.objectUrl, '_blank');
}

/* Basic HTML escaping */
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
