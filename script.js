// --- CONFIGURATION ---
const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

// --- STATE ---
let allPoData = []; 
let displayHeaders = []; 

// --- DOM ELEMENTS ---
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const tableContainer = document.getElementById('table-container');
const loadingBarContainer = document.getElementById('loading-bar-container');
const loadingBar = document.getElementById('loading-bar');

// --- Loading Bar Controls (Unchanged) ---
function showLoadingBar() {
    loadingBarContainer.style.display = 'block';
    loadingBar.style.width = '0%';
    setTimeout(() => { loadingBar.style.width = '85%'; }, 50); 
}

function hideLoadingBar() {
    loadingBar.style.width = '100%';
    setTimeout(() => { loadingBarContainer.style.display = 'none'; }, 1600); 
}

// --- MAIN FUNCTIONS ---

async function fetchAndUpdateCache() {
    showLoadingBar();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        
        const freshData = await response.json();
        const freshDataString = JSON.stringify(freshData);
        const cachedDataString = localStorage.getItem('poCache');

        if (freshDataString !== cachedDataString) {
            console.log("Data has changed. Updating view and cache.");
            allPoData = freshData.poData;
            displayHeaders = freshData.displayHeaders;
            renderTable(allPoData);
            localStorage.setItem('poCache', freshDataString);
        } else {
            console.log("Data is up-to-date. No changes needed.");
        }
    } catch (error) {
        if (allPoData.length === 0) {
            tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`;
        }
        console.error("Failed to fetch fresh data:", error);
    } finally {
        hideLoadingBar();
    }
}

// --- CRITICAL UPDATE in this function ---
function renderTable(data) {
    if (displayHeaders.length === 0) {
        tableContainer.innerHTML = '<p class="loader">Configuration error: Headers not found in settings.</p>';
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    let filteredData = searchTerm
        ? data.filter(row => 
            Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            )
        )
        : [...data];
    
    const filterValue = statusFilter.value;
    if (filterValue === 'all') { 
        filteredData = filteredData.filter(row => row['PO Status'] === 'Pending' || row['PO Status'] === 'Partial');
    } else if (filterValue === 'Received') {
        filteredData = filteredData.filter(row => row['PO Status'] === 'Received');
    }

    if (filteredData.length === 0) {
        tableContainer.innerHTML = '<p class="loader">No matching records found.</p>';
        return;
    }

    let tableHtml = `<table><thead><tr>`;
    displayHeaders.forEach(h => tableHtml += `<th>${h}</th>`);
    tableHtml += `<th>Receive</th></tr></thead><tbody>`;

    filteredData.forEach(row => {
        tableHtml += `<tr>`;
        displayHeaders.forEach(header => {
            let value = row[header] === undefined ? '' : row[header];
            if ((header === 'PO Date' || header === 'Material In Date') && value) {
                value = new Date(value).toLocaleDateString();
            }
            // NEW: Added 'data-label' attribute for responsive CSS
            tableHtml += `<td data-label="${header}">${value}</td>`;
        });
        // NEW: Added 'data-label' for the receive cell as well
        tableHtml += `
            <td data-label="Receive" class="receive-cell">
                <input type="number" class="receive-qty" value="1" min="1">
                <button class="receive-btn" data-code="${row.CODE}">Receive</button>
            </td>
        `;
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    tableContainer.innerHTML = tableHtml;
}

async function receiveItem(code, quantity) {
    const btn = document.querySelector(`button[data-code="${code}"]`);
    btn.disabled = true;
    btn.textContent = '...';
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify({ code: code, qtyReceived: quantity }),
        });
        await fetchAndUpdateCache(); 
    } catch (error) {
        console.error("Error updating PO:", error);
        alert(`Error updating PO: ${error.message}`);
        btn.disabled = false;
        btn.textContent = 'Receive';
    }
}

function loadFromCache() {
    const cachedResponse = localStorage.getItem('poCache');
    if (cachedResponse) {
        console.log("Loading data from cache! ⚡");
        const cachedData = JSON.parse(cachedResponse);
        allPoData = cachedData.poData;
        displayHeaders = cachedData.displayHeaders;
        renderTable(allPoData);
        return true;
    }
    return false;
}

function initializeApp() {
    if (!loadFromCache()) {
        tableContainer.innerHTML = `<p class="loader">Fetching fresh data...</p>`;
    }
    fetchAndUpdateCache(); 
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeApp);
searchInput.addEventListener('input', () => renderTable(allPoData));
statusFilter.addEventListener('change', () => renderTable(allPoData));
tableContainer.addEventListener('click', function(event) {
    if (event.target.classList.contains('receive-btn')) {
        const button = event.target;
        const code = button.dataset.code;
        const qtyInput = button.closest('.receive-cell').querySelector('.receive-qty');
        const quantity = parseInt(qtyInput.value, 10);
        if (quantity > 0) {
            receiveItem(code, quantity);
        } else {
            alert('Please enter a quantity greater than 0.');
        }
    }
});
