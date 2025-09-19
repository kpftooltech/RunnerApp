// This file contains all the client-side logic for your application.

// --- IMPORTANT ---
// This is the API link from your Google Apps Script deployment.
const API_URL = 'https://script.google.com/macros/s/AKfycbwOTpgaoSeg3Gvz3L72ILh0TgIGz0-sL8UAUD9FAjQhdK7IN2CIuTIppUqC22fqYzxc/exec';

// Global variable to hold our application data (parents and children).
let appData = {
  parents: [],
  children: []
};
const CACHE_KEY = 'dcManagementData'; // Key for local storage

/**
 * This function runs automatically when the page content is loaded.
 */
window.addEventListener('DOMContentLoaded', () => {
  loadData();
});

/**
 * Handles loading data, either from local storage or by fetching from the server.
 */
function loadData() {
  const cachedData = localStorage.getItem(CACHE_KEY);

  if (cachedData) {
    console.log("Loading data from Local Storage...");
    appData = JSON.parse(cachedData);
    renderParentList();
    document.getElementById('loader').style.display = 'none';
  } else {
    console.log("Fetching fresh data from server...");
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getInitialData' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Convert the returned 2D arrays into more usable arrays of objects.
        // Assumes your sheet columns are in the specified order.
        appData.parents = data.parents.map(p => ({ transferId: p[0], timestamp: p[1], preparedBy: p[2], fromSupplier: p[3], toSupplier: p[4], jobType: p[5], status: p[6], dcLink: p[7] }));
        appData.children = data.children.map(c => ({ transferId: c[0], itemCode: c[1], quantity: c[2], note: c[3] }));
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(appData));
        renderParentList();
        document.getElementById('loader').style.display = 'none';
      } else {
        document.getElementById('loader').innerText = 'Error loading data: ' + data.message;
      }
    })
    .catch(error => {
        console.error('Fetch Error:', error);
        document.getElementById('loader').innerText = 'A network error occurred. Please check the console.';
    });
  }
}

/**
 * Renders the list of parent DCs in the left-side panel.
 */
function renderParentList() {
  const parentListDiv = document.getElementById('parent-list');
  parentListDiv.innerHTML = '';

  appData.parents.forEach(parent => {
    const row = document.createElement('div');
    row.className = 'dc-row';
    row.dataset.transferId = parent.transferId;
    
    const info = document.createElement('div');
    info.innerHTML = `<strong>ID:</strong> ${parent.transferId}<br><strong>Status:</strong> <span class="status">${parent.status}</span>`;
    row.appendChild(info);
    
    if (parent.status === 'Draft') {
      const button = document.createElement('button');
      button.className = 'finalize-btn';
      button.innerText = 'Finalize';
      button.onclick = (e) => {
        e.stopPropagation();
        handleFinalizeClick(parent.transferId, button);
      };
      row.appendChild(button);
    }

    row.onclick = () => renderChildItems(parent.transferId);
    parentListDiv.appendChild(row);
  });
}

/**
 * Renders the child items in the right-side panel for a selected parent DC.
 * @param {string} transferId The ID of the parent DC to display children for.
 */
function renderChildItems(transferId) {
  document.querySelectorAll('.dc-row').forEach(r => r.classList.remove('selected'));
  document.querySelector(`.dc-row[data-transfer-id='${transferId}']`).classList.add('selected');

  const childListDiv = document.getElementById('child-items-list');
  const filteredChildren = appData.children.filter(child => child.transferId === transferId);

  if (filteredChildren.length === 0) {
    childListDiv.innerHTML = '<p>No items found for this DC.</p>';
    return;
  }

  let html = '<table><thead><tr><th>#</th><th>Item Code</th><th>Quantity</th><th>Note</th></tr></thead><tbody>';
  filteredChildren.forEach((item, index) => {
    html += `<tr><td>${index + 1}</td><td>${item.itemCode || ''}</td><td>${item.quantity || ''}</td><td>${item.note || ''}</td></tr>`;
  });
  html += '</tbody></table>';
  childListDiv.innerHTML = html;
}

/**
 * Handles the click event for the "Finalize" button. Calls the back-end API.
 * @param {string} transferId The ID of the DC to be finalized.
 * @param {HTMLButtonElement} button The button element that was clicked.
 */
function handleFinalizeClick(transferId, button) {
  button.disabled = true;
  button.innerText = '...';

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finalizeDC', transferId: transferId })
  })
  .then(response => response.json())
  .then(response => {
    if (response.success) {
      const parentIndex = appData.parents.findIndex(p => p.transferId === response.transferId);
      if (parentIndex > -1) {
        appData.parents[parentIndex].status = 'Completed';
        localStorage.setItem(CACHE_KEY, JSON.stringify(appData));
      }
      
      renderParentList();
      alert('DC Finalized Successfully!');
    } else {
      alert('Could not finalize: ' + response.message);
      button.disabled = false;
      button.innerText = 'Finalize';
    }
  })
  .catch(error => {
      console.error('Fetch Error:', error);
      alert('A network error occurred while finalizing.');
      button.disabled = false;
      button.innerText = 'Finalize';
  });
}
