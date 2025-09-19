// --- NEW CONFIGURATION ---
const SPREADSHEET_ID = '1mkmxX83zyr1SLFi9ax3fbxgOr7UmtmqgwCsVhTMjUkE';
const API_KEY = 'AIzaSyC-Kr1zUvzyE_jV_GqWvHcE_cdnfQJ1wX8';

// These must exactly match the names of your sheet tabs
const PARENT_SHEET_NAME = 'dc';
const CHILD_SHEET_NAME = 'dc_items';

// --- Global variables ---
let appData = {
  parents: [],
  children: []
};
const CACHE_KEY = 'dcManagementData'; // Key for browser's local storage

/**
 * This function runs automatically when the page content is loaded.
 */
window.addEventListener('DOMContentLoaded', () => {
  loadData();
});

/**
 * Handles loading data, either from the local cache or by fetching from the Google Sheets API.
 */
function loadData() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    console.log("Loading data from Local Storage...");
    appData = JSON.parse(cachedData);
    renderParentList();
    document.getElementById('loader').style.display = 'none';
    return;
  }
  
  console.log("Fetching fresh data from Google Sheets API...");

  const parentUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PARENT_SHEET_NAME}?key=${API_KEY}`;
  const childUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${CHILD_SHEET_NAME}?key=${API_KEY}`;

  Promise.all([
    fetch(parentUrl),
    fetch(childUrl)
  ])
  .then(responses => {
    // This part checks each response and provides a detailed error message if one fails.
    return Promise.all(responses.map(res => {
      if (!res.ok) {
        // If the response is not OK, read the specific error message from Google.
        return res.json().then(errorData => {
          throw new Error(`HTTP error! status: ${res.status}, message: ${JSON.stringify(errorData)}`);
        });
      }
      return res.json();
    }));
  })
  .then(data => {
    // data[0] is the response for parents, data[1] is for children.
    const parentValues = data[0].values || [];
    const childValues = data[1].values || [];

    // The API returns arrays; we convert them to objects using the headers.
    const parentHeaders = parentValues.shift(); // Get headers from the first row
    const childHeaders = childValues.shift();

    appData.parents = parentValues.map(row => {
      let obj = {};
      parentHeaders.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

    appData.children = childValues.map(row => {
      let obj = {};
      childHeaders.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });
    
    // Save the freshly fetched data to the local cache.
    localStorage.setItem(CACHE_KEY, JSON.stringify(appData));
    renderParentList();
    document.getElementById('loader').style.display = 'none';
  })
  .catch(error => {
    // The detailed error from the block above will be displayed in the console.
    console.error('Error fetching from Sheets API:', error);
    document.getElementById('loader').innerText = 'Error loading data. Check the console (F12) for details.';
  });
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
    // IMPORTANT: "TransferID" and "Status" must match your sheet's header names exactly.
    row.dataset.transferId = parent.TransferID;
    
    const info = document.createElement('div');
    info.innerHTML = `<strong>ID:</strong> ${parent.TransferID}<br><strong>Status:</strong> <span class="status">${parent.Status}</span>`;
    row.appendChild(info);
    
    if (parent.Status === 'Draft') {
      const button = document.createElement('button');
      button.className = 'finalize-btn';
      button.innerText = 'Finalize';
      button.onclick = (e) => {
        e.stopPropagation();
        handleFinalizeClick(parent.TransferID, button);
      };
      row.appendChild(button);
    }

    row.onclick = () => renderChildItems(parent.TransferID);
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
  // IMPORTANT: "TransferID" must match your sheet's header name.
  const filteredChildren = appData.children.filter(child => child.TransferID === transferId);

  if (filteredChildren.length === 0) {
    childListDiv.innerHTML = '<p>No items found for this DC.</p>';
    return;
  }

  let html = '<table><thead><tr><th>#</th><th>Item Code</th><th>Quantity</th><th>Note</th></tr></thead><tbody>';
  filteredChildren.forEach((item, index) => {
    // IMPORTANT: "ItemCode", "Quantity", and "Note" must match your sheet's header names.
    html += `<tr><td>${index + 1}</td><td>${item.ItemCode || ''}</td><td>${item.Quantity || ''}</td><td>${item.Note || ''}</td></tr>`;
  });
  html += '</tbody></table>';
  childListDiv.innerHTML = html;
}

/**
 * IMPORTANT NOTE ON UPDATING DATA
 * This function is a placeholder. Writing data back to the sheet requires a more 
 * advanced API setup (OAuth 2.0) because API Keys are for read-only access to public data.
 */
function handleFinalizeClick(transferId, button) {
    alert("Updating data requires a more advanced API setup (OAuth 2.0), which is not configured yet. The first step is getting the data to read correctly.");
    // The fetch call to the old Apps Script URL is removed.
}
