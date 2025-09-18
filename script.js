// --- CONFIGURATION ---
// PASTE THE WEB APP URL YOU COPIED FROM THE APPS SCRIPT DEPLOYMENT
const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

// --- STATE ---
let allPoData = []; // This will hold the original data from the sheet (our cache)

// --- DOM ELEMENTS ---
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const tableContainer = document.getElementById('table-container');


// --- FUNCTIONS ---

// 1. Fetch data from the API and initialize the app
async function initializeApp() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok.');
        
        allPoData = await response.json();
        renderTable(allPoData); // Initial render
    } catch (error) {
        tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`;
        console.error("Failed to fetch data:", error);
    }
}

// 2. Render the table with the provided data
function renderTable(data) {
    // Filter out rows that have "Received" status unless the filter is set to "all" or "Received"
    let filteredData = data;
    if (statusFilter.value !== 'all' && statusFilter.value !== 'Received') {
        filteredData = data.filter(row => row['PO Status'] === 'Pending' || row['PO Status'] === 'Partial');
    }
    
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredData = filteredData.filter(row => 
            row.CODE.toString().toLowerCase().includes(searchTerm) ||
            row.ITEM.toString().toLowerCase().includes(searchTerm) ||
            row['PO Number'].toString().toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter.value !== 'all') {
        filteredData = filteredData.filter(row => row['PO Status'] === statusFilter.value);
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
            // Format date for better readability
            if (header === 'PO Date' || header === 'Material In Date') {
                value = value ? new Date(value).toLocaleDateString() : '';
            }
            tableHtml += `<td>${value}</td>`;
        });
        // Add the receiving cell
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


// 3. Update a PO item by sending data to the backend
async function receiveItem(code, quantity) {
    const btn = document.querySelector(`button[data-code="${code}"]`);
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for simple POST requests to Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code, qtyReceived: quantity }),
        });
        
        // With no-cors, we can't read the response, but we can assume success and refresh
        alert(`Successfully submitted receipt for ${quantity} of ${code}. Data will refresh.`);
        initializeApp(); // Re-fetch all data to show the update

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
