// --- CONFIGURATION ---
// PASTE THE WEB APP URL YOU COPIED FROM THE APPS SCRIPT DEPLOYMENT
const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

// --- STATE ---
let allPoData = []; // This will hold the current data for filtering/display

// --- DOM ELEMENTS ---
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const tableContainer = document.getElementById('table-container');


// --- FUNCTIONS ---

// 1. NEW - Main function to start the application
function initializeApp() {
    const isCacheLoaded = loadFromCache();
    // If cache isn't loaded, the fetch function will show the "Loading..." message.
    // If cache is loaded, the user sees data instantly while we refresh in the background.
    if (!isCacheLoaded) {
        tableContainer.innerHTML = `<p class="loader">Fetching fresh data...</p>`;
    }
    fetchAndUpdateCache(); 
}

// 2. NEW - Function to load data from localStorage
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

// 3. NEW - Function to fetch data and update the cache if needed
async function fetchAndUpdateCache() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        
        const freshData = await response.json();
        const freshDataString = JSON.stringify(freshData);
        const cachedDataString = localStorage.getItem('poDataCache');

        // Only re-render and update cache if the data has actually changed
        if (freshDataString !== cachedDataString) {
            console.log("Data has changed. Updating view and cache.");
            allPoData = freshData;
            renderTable(allPoData);
            localStorage.setItem('poDataCache', freshDataString);
        } else {
            console.log("Data is up-to-date. No changes needed.");
        }

    } catch (error) {
        // Only show error if there's no cached data to display
        if (allPoData.length === 0) {
            tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`;
        }
        console.error("Failed to fetch fresh data:", error);
    }
}

// 4. Render the table (This function is mostly the same)
function renderTable(data) {
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    let filteredData = searchTerm
        ? data.filter(row => 
            row.CODE.toString().toLowerCase().includes(searchTerm) ||
            row.ITEM.toString().toLowerCase().includes(searchTerm) ||
            row['PO Number'].toString().toLowerCase().includes(searchTerm)
          )
        : [...data]; // Use a copy of the data
    
    // Apply status filter
    if (statusFilter.value !== 'all') {
        filteredData = filteredData.filter(row => row['PO Status'] === statusFilter.value);
    } else {
         // Default view: Hide "Received" items unless explicitly selected
         filteredData = filteredData.filter(row => row['PO Status'] !== 'Received');
    }

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


// 5. Update a PO item (MODIFIED to force a refresh)
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
        // Force a fetch from the network to get the absolute latest data and update the cache.
        fetchAndUpdateCache(); 

    } catch (error) {
        console.error("Error updating PO:", error);
        alert(`Error updating PO: ${error.message}`);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- EVENT LISTENERS ---

// Listen for page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Listen for input in search and filter controls
searchInput.addEventListener('input', () => renderTable(allPoData));
statusFilter.addEventListener('change', () => renderTable(allPoData));

// Listen for clicks on the receive buttons (using event delegation)
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
