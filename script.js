// --- CONFIGURATION ---
const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

// --- STATE ---
let allPoData = []; 

// --- DOM ELEMENTS ---
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const tableContainer = document.getElementById('table-container');
const loadingBarContainer = document.getElementById('loading-bar-container'); // NEW
const loadingBar = document.getElementById('loading-bar'); // NEW

// --- NEW: Loading Bar Controls ---
function showLoadingBar() {
    loadingBarContainer.style.display = 'block';
    loadingBar.style.width = '0%';
    // A tiny timeout allows the browser to apply the 'display: block' before starting the transition
    setTimeout(() => { loadingBar.style.width = '85%'; }, 50); 
}

function hideLoadingBar() {
    loadingBar.style.width = '100%';
    // Wait for the animation to finish before hiding the container
    setTimeout(() => { loadingBarContainer.style.display = 'none'; }, 1600); 
}


// --- FUNCTIONS ---

// 1. Main function to start the application
function initializeApp() {
    const isCacheLoaded = loadFromCache();
    if (!isCacheLoaded) {
        tableContainer.innerHTML = `<p class="loader">Fetching fresh data...</p>`;
    }
    fetchAndUpdateCache(); 
}

// 2. Function to load data from localStorage
function loadFromCache() {
    const cachedData = localStorage.getItem('poDataCache');
    if (cachedData) {
        console.log("Loading data from cache! ⚡");
        allPoData = JSON.parse(cachedData);
        renderTable(allPoData);
        return true;
    }
    console.log("No cache found.");
    return false;
}

// 3. Function to fetch data and update the cache (MODIFIED)
async function fetchAndUpdateCache() {
    showLoadingBar(); // Show the bar before fetching
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        
        const freshData = await response.json();
        const freshDataString = JSON.stringify(freshData);
        const cachedDataString = localStorage.getItem('poDataCache');

        if (freshDataString !== cachedDataString) {
            console.log("Data has changed. Updating view and cache.");
            allPoData = freshData;
            renderTable(allPoData);
            localStorage.setItem('poDataCache', freshDataString);
        } else {
            console.log("Data is up-to-date. No changes needed.");
        }

    } catch (error) {
        if (allPoData.length === 0) {
            tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`;
        }
        console.error("Failed to fetch fresh data:", error);
    } finally {
        hideLoadingBar(); // Always hide the bar when done
    }
}

// 4. Render the table (Slightly modified filter logic)
function renderTable(data) {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredData = searchTerm
        ? data.filter(row => 
            String(row.CODE).toLowerCase().includes(searchTerm) ||
            String(row.ITEM).toLowerCase().includes(searchTerm) ||
            String(row['PO Number']).toLowerCase().includes(searchTerm)
          )
        : [...data];
    
    const filterValue = statusFilter.value;
    if (filterValue === 'all') { // Default: Pending & Partial
        filteredData = filteredData.filter(row => row['PO Status'] === 'Pending' || row['PO Status'] === 'Partial');
    } else if (filterValue === 'Received') {
        filteredData = filteredData.filter(row => row['PO Status'] === 'Received');
    } // If 'all-statuses', no status filter is applied

    if (filteredData.length === 0) {
        tableContainer.innerHTML = '<p class="loader">No matching records found.</p>';
        return;
    }

    const headers = Object.keys(filteredData[0]);
    let tableHtml = `<table><thead><tr>`;
    headers.forEach(h => tableHtml += `<th>${h}</th>`);
    tableHtml += `<th>Receive</th></tr></thead><tbody>`;

    filteredData.forEach(row => {
        tableHtml += `<tr>`;
        headers.forEach(header => {
            let value = row[header];
            if (header === 'PO Date' || header === 'Material In Date') {
                value = value ? new Date(value).toLocaleDateString() : '';
            }
            tableHtml += `<td>${value}</td>`;
        });
        tableHtml += `
            <td class="receive-cell">
                <input type="number" class="receive-qty" value="1" min="1">
                <button class="receive-btn" data-code="${row.CODE}">Receive</button>
            </td>
        `;
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table>`;
    tableContainer.innerHTML = tableHtml;
}


// 5. Update a PO item
async function receiveItem(code, quantity) {
    const btn = document.querySelector(`button[data-code="${code}"]`);
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, qtyReceived: quantity }),
        });
        
        alert(`Successfully submitted receipt for ${quantity} of ${code}. Data will refresh.`);
        fetchAndUpdateCache(); 
    } catch (error) {
        console.error("Error updating PO:", error);
        alert(`Error updating PO: ${error.message}`);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeApp);
searchInput.addEventListener('input', () => renderTable(allPoData));
statusFilter.addEventListener('change', () => renderTable(allPoData));
tableContainer.addEventListener('click', function(event) {
    if (event.target.classList.contains('receive-btn')) {
        const button = event.target;
        const code = button.dataset.code;
        const qtyInput = button.previousElementSibling;
        const quantity = parseInt(qtyInput.value, 10);
        if (quantity > 0) {
            if (confirm(`Are you sure you want to receive ${quantity} of item ${code}?`)) {
                receiveItem(code, quantity);
            }
        } else {
            alert('Please enter a quantity greater than 0.');
        }
    }
});
