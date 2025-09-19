// --- NEW CONFIGURATION ---
const SPREADSHEET_ID = '1mkmxX83zyr1SLFi9ax3fbxgOr7UmtmqgwCsVhTMjUkE';
const API_KEY = 'AIzaSyC-Kr1zUvzyE_jV_GqWvHcE_cdnfQJ1wX8';

// These are the names of your sheets (tabs)
const PARENT_SHEET_NAME = 'dc';
const CHILD_SHEET_NAME = 'dc_items';

// --- Global variables and cache key remain the same ---
let appData = { parents: [], children: [] };
const CACHE_KEY = 'dcManagementData';

window.addEventListener('DOMContentLoaded', () => {
  loadData();
});

/**
 * NEW loadData function using the official Google Sheets API
 */
function loadData() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    console.log("Loading from cache...");
    appData = JSON.parse(cachedData);
    renderParentList();
    document.getElementById('loader').style.display = 'none';
    return;
  }
  
  console.log("Fetching fresh data from Google Sheets API...");

  // We need to make two separate calls to get both sheets
  const parentUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PARENT_SHEET_NAME}?key=${API_KEY}`;
  const childUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${CHILD_SHEET_NAME}?key=${API_KEY}`;

  Promise.all([
    fetch(parentUrl),
    fetch(childUrl)
  ])
  .then(responses => Promise.all(responses.map(res => res.json())))
  .then(data => {
    // The first element in `data` is the response for parents, the second is for children
    const parentValues = data[0].values || [];
    const childValues = data[1].values || [];

    // The API returns a 2D array. We need to convert it to an array of objects.
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
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(appData));
    renderParentList();
    document.getElementById('loader').style.display = 'none';
  })
  .catch(error => {
    console.error('Error fetching from Sheets API:', error);
    document.getElementById('loader').innerText = 'Error loading data. Check console.';
  });
}

/**
 * IMPORTANT NOTE ON UPDATING DATA
 * The finalizeDC function will NOT work with a simple API Key, as API keys are for
 * public, read-only data. To WRITE or UPDATE data, you would need to implement
 * a more advanced authentication system called OAuth 2.0.
 *
 * This is a much more complex topic. The first step is to get your data reading correctly.
 */
function handleFinalizeClick(transferId, button) {
    alert("Updating data requires a more advanced API setup (OAuth 2.0) that is not configured yet.");
    // The old fetch call to the Apps Script URL is now removed.
}


// The renderParentList() and renderChildItems() functions remain the same as before,
// but they now expect the data to be objects with named properties (e.g., parent.TransferID)
// based on your sheet headers. You might need to adjust them slightly.

function renderParentList() {
  const parentListDiv = document.getElementById('parent-list');
  parentListDiv.innerHTML = '';

  appData.parents.forEach(parent => {
    const row = document.createElement('div');
    row.className = 'dc-row';
    // IMPORTANT: Use the actual header names from your sheet here
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

function renderChildItems(transferId) {
  document.querySelectorAll('.dc-row').forEach(r => r.classList.remove('selected'));
  document.querySelector(`.dc-row[data-transfer-id='${transferId}']`).classList.add('selected');

  const childListDiv = document.getElementById('child-items-list');
  const filteredChildren = appData.children.filter(child => child.TransferID === transferId);

  if (filteredChildren.length === 0) {
    childListDiv.innerHTML = '<p>No items found for this DC.</p>';
    return;
  }

  let html = '<table><thead><tr><th>#</th><th>Item Code</th><th>Quantity</th><th>Note</th></tr></thead><tbody>';
  filteredChildren.forEach((item, index) => {
    // IMPORTANT: Use the actual header names from your child sheet here
    html += `<tr><td>${index + 1}</td><td>${item.ItemCode || ''}</td><td>${item.Quantity || ''}</td><td>${item.Note || ''}</td></tr>`;
  });
  html += '</tbody></table>';
  childListDiv.innerHTML = html;
}
