'use strict';

/*
  NOTE:
  - Do NOT embed secret keys (Pinata JWT) in client-side code for production.
  - Replace client uploads with a server-side endpoint that signs/forwards requests,
    or set PINATA_JWT here only for local testing (not recommended).
*/

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNmU5ZDY3Mi05MjhiLTRlYWQtOTViMi1hYTRmNGIyODhjNjciLCJlbWFpbCI6InVwYWRoeWF5eWFzaDgyOEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOGJjMzNjNDIyNmRlMTk0NGYzZWQiLCJzY29wZWRLZXlTZWNyZXQiOiI2MmMwMDFmMGMzM2QzMzExYmM4YTY0MjYxNTVjNzA2MTU2Mzg3ZjIzODBhMjM0ZWRmMDU3MDlkNThhNTg4NjBjIiwiZXhwIjoxNzk0NTYzOTY0fQ.TND-ia2X8jI33dibYp68R2Zh64_orOPthVnqtl0qt5w';

// Document storage object - stores file data for each document
const documentStorage = {
    1: { files: [] },
    2: { files: [] },
    3: { files: [] },
    4: { files: [] }
};

// Currently selected document ID for upload
let currentDocId = null;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.querySelector('.upload-area-inline');
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    const getStartedBtn = document.querySelector('.btn-primary');

    // File upload handling from main upload card
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => {
            currentDocId = null; // Upload to general area
            fileInput.click();
        });

        // Drag and drop on upload card
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
            currentDocId = null;
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = ''; // Reset input
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
            const uploadSection = document.querySelector('.documents');
            if (uploadSection) {
                uploadSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Handle document card clicks for uploading
    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        if (viewBtn && !e.target.closest('.upload-card')) {
            e.stopPropagation();
            const card = viewBtn.closest('.document-card');
            const docId = card.getAttribute('data-doc-id');
            viewDocument(docId);
            return;
        }

        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn && !e.target.closest('.upload-card')) {
            e.stopPropagation();
            const card = deleteBtn.closest('.document-card');
            const docId = card.getAttribute('data-doc-id');
            deleteDocument(docId);
            return;
        }

        // Click on document card to upload
        const card = e.target.closest('.document-card[data-doc-id]');
        if (card) {
            const docId = card.getAttribute('data-doc-id');
            
            // Allow upload if no files exist yet
            if (documentStorage[docId].files.length === 0) {
                currentDocId = docId;
                fileInput.click();
            }
        }
    });

    // Initialize all document cards
    document.querySelectorAll('.document-card[data-doc-id]').forEach(card => {
        const docId = card.getAttribute('data-doc-id');
        updateDocumentCard(docId);
        createFileListContainer(docId);
    });
});

/* Create file list container under each document card */
function createFileListContainer(docId) {
    const card = document.querySelector(`[data-doc-id="${docId}"]`);
    if (!card) return;

    // Remove existing file list if any
    const existingList = card.querySelector('.file-list-container');
    if (existingList) {
        existingList.remove();
    }

    // Create new file list container
    const fileListContainer = document.createElement('div');
    fileListContainer.className = 'file-list-container';
    fileListContainer.style.marginTop = '10px';
    fileListContainer.style.paddingTop = '10px';
    fileListContainer.style.borderTop = '1px solid #eee';
    fileListContainer.id = `file-list-${docId}`;

    card.appendChild(fileListContainer);
}

/* Handle file uploads */
function handleFiles(files) {
    if (!files || files.length === 0) return;

    // If uploading to a specific document, only take the first file
    if (currentDocId) {
        uploadFileToIPFS(files[0], currentDocId);
    } else {
        // Multiple uploads to general area
        Array.from(files).forEach(file => {
            uploadFileToIPFS(file);
        });
    }
}

/* Upload file to IPFS via Pinata */
async function uploadFileToIPFS(file, docId = null) {
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
                Authorization: `Bearer ${PINATA_JWT}`
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

        // If uploading to specific document
        if (docId) {
            const fileObj = {
                name: file.name,
                type: file.type,
                size: file.size,
                uploadDate: new Date().toLocaleDateString(),
                cid: cid,
                ipfsUrl: `https://ipfs.io/ipfs/${encodeURIComponent(cid)}`,
                data: file
            };
            
            // Store file under the specific document
            documentStorage[docId].files.push(fileObj);
            updateDocumentCard(docId);
            updateFileList(docId);
            alert(`${file.name} uploaded successfully to this document!`);
        } else {
            // Add to general grid
            addDocumentToGrid(file.name, cid);
            alert(`Upload successful! CID: ${cid}`);
        }
    } catch (err) {
        console.error(err);
        alert('Upload failed: ' + (err && err.message ? err.message : err));
    }
}

/* Update file list display under document card */
function updateFileList(docId) {
    const fileListContainer = document.querySelector(`#file-list-${docId}`);
    if (!fileListContainer) return;

    const files = documentStorage[docId].files;
    
    // Clear existing list
    fileListContainer.innerHTML = '';

    if (files.length === 0) {
        return;
    }

    // Create file list
    const fileList = document.createElement('div');
    fileList.style.backgroundColor = '#f9f9f9';
    fileList.style.padding = '10px';
    fileList.style.borderRadius = '5px';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.display = 'flex';
        fileItem.style.justifyContent = 'space-between';
        fileItem.style.alignItems = 'center';
        fileItem.style.padding = '8px 0';
        fileItem.style.borderBottom = index < files.length - 1 ? '1px solid #eee' : 'none';

        const fileInfo = document.createElement('div');
        fileInfo.style.flex = '1';
        fileInfo.innerHTML = `
            <div style="font-weight: 500; color: #333;">${escapeHtml(file.name)}</div>
            <div style="font-size: 0.85em; color: #999;">Uploaded: ${file.uploadDate}</div>
        `;

        const fileActions = document.createElement('div');
        fileActions.style.display = 'flex';
        fileActions.style.gap = '5px';

        const viewLink = document.createElement('a');
        viewLink.textContent = 'View';
        viewLink.href = file.ipfsUrl;
        viewLink.target = '_blank';
        viewLink.rel = 'noopener';
        viewLink.style.padding = '5px 10px';
        viewLink.style.backgroundColor = '#007bff';
        viewLink.style.color = '#fff';
        viewLink.style.textDecoration = 'none';
        viewLink.style.borderRadius = '3px';
        viewLink.style.fontSize = '0.9em';

        const downloadLink = document.createElement('a');
        downloadLink.textContent = 'Download';
        downloadLink.href = file.ipfsUrl;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener';
        downloadLink.style.padding = '5px 10px';
        downloadLink.style.backgroundColor = '#28a745';
        downloadLink.style.color = '#fff';
        downloadLink.style.textDecoration = 'none';
        downloadLink.style.borderRadius = '3px';
        downloadLink.style.fontSize = '0.9em';

        fileActions.appendChild(viewLink);
        fileActions.appendChild(downloadLink);

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileActions);
        fileList.appendChild(fileItem);
    });

    fileListContainer.appendChild(fileList);
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

// Update document card display
function updateDocumentCard(docId) {
    const card = document.querySelector(`[data-doc-id="${docId}"]`);
    if (!card) return;

    const statusText = card.querySelector('.doc-status');
    const viewBtn = card.querySelector('.view-btn');
    const deleteBtn = card.querySelector('.btn-delete');
    
    const filesCount = documentStorage[docId].files.length;
    
    if (filesCount > 0) {
        // File uploaded
        const doc = documentStorage[docId].files[0]; // Get first file
        statusText.textContent = `📎 ${doc.name}`;
        statusText.style.fontSize = '0.9em';
        statusText.style.color = '#666';
        
        viewBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        
        // Make card non-clickable when file exists
        card.style.cursor = 'default';
    } else {
        // No file
        statusText.textContent = 'Click to upload';
        statusText.style.fontSize = '0.9em';
        statusText.style.color = '#999';
        viewBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        
        // Make card clickable for upload
        card.style.cursor = 'pointer';
    }
}

// View document
function viewDocument(docId) {
    const files = documentStorage[docId].files;
    
    if (files.length === 0) {
        alert('No files in this folder');
        return;
    }
    
    const doc = files[0]; // View first file
    
    // Open IPFS link or local file
    if (doc.ipfsUrl) {
        window.open(doc.ipfsUrl, '_blank');
    } else {
        const fileURL = URL.createObjectURL(doc.data);
        window.open(fileURL, '_blank');
    }
}

// Delete document
function deleteDocument(docId) {
    if (confirm('Are you sure you want to delete this document?')) {
        documentStorage[docId].files = [];
        updateDocumentCard(docId);
        updateFileList(docId);
    }
}
