// --- CONFIGURATION ---
const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

// --- STATE ---
let allPoData = []; 
let displayHeaders = []; 
let selection = []; // NEW: Array to store selected CODEs

// --- DOM ELEMENTS ---
const mainPage = document.getElementById('main-page');
const summaryPage = document.getElementById('summary-page');
const createSummaryBtn = document.getElementById('create-summary-btn');
const submitSummaryBtn = document.getElementById('submit-summary-btn');
const cancelSummaryBtn = document.getElementById('cancel-summary-btn');
// ... (all your other DOM elements)

// --- NEW: VIEW MANAGEMENT ---
function showSummaryView() {
    generateSummaryList();
    mainPage.style.display = 'none';
    summaryPage.style.display = 'block';
}

function showMainView() {
    selection = []; // Clear selection
    mainPage.style.display = 'block';
    summaryPage.style.display = 'none';
    renderTable(allPoData); // Re-render to clear checkboxes
}

// --- NEW: SUMMARY PAGE LOGIC ---
function generateSummaryList() {
    const summaryList = document.getElementById('summary-list');
    const selectedItems = allPoData.filter(item => selection.includes(item.CODE));
    
    if (selectedItems.length === 0) {
        summaryList.innerHTML = `<p>No items selected.</p>`;
        return;
    }
    
    let html = '';
    selectedItems.forEach(item => {
        html += `
            <div class="summary-item" data-code="${item.CODE}">
                <div class="summary-item-info">
                    <p class="code">${item.CODE} - ${item.ITEM}</p>
                    <p class="desc">Ordered: ${item.QTY}, Received: ${item.['Qty Received']}</p>
                </div>
                <input type="number" class="summary-qty" value="1" min="0">
            </div>
        `;
    });
    summaryList.innerHTML = html;
    updateSummaryStats();
}

function updateSummaryStats() {
    const qtyInputs = document.querySelectorAll('.summary-qty');
    let totalItems = 0;
    let totalQty = 0;
    qtyInputs.forEach(input => {
        const qty = parseInt(input.value, 10) || 0;
        if (qty > 0) {
            totalItems++;
            totalQty += qty;
        }
    });
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-qty').textContent = totalQty;
}

async function submitSummary() {
    submitSummaryBtn.disabled = true;
    submitSummaryBtn.textContent = 'Submitting...';
    
    const itemsToUpdate = [];
    const summaryItems = document.querySelectorAll('.summary-item');
    summaryItems.forEach(item => {
        const qty = parseInt(item.querySelector('.summary-qty').value, 10) || 0;
        if (qty > 0) {
            itemsToUpdate.push({
                code: item.dataset.code,
                qtyReceived: qty
            });
        }
    });

    if (itemsToUpdate.length === 0) {
        alert("Please enter a quantity for at least one item.");
        submitSummaryBtn.disabled = false;
        submitSummaryBtn.textContent = 'Submit Delivery';
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'bulkUpdate', // Key to trigger the bulk function
                items: itemsToUpdate
            })
        });
        alert("Delivery summary submitted successfully! Data will now refresh.");
        localStorage.removeItem('poCache'); // Invalidate cache
        showMainView();
        initializeApp();

    } catch(error) {
        alert(`Error: ${error.message}`);
    } finally {
        submitSummaryBtn.disabled = false;
        submitSummaryBtn.textContent = 'Submit Delivery';
    }
}

// --- MODIFIED RENDER TABLE to include checkboxes ---
function renderTable(data) {
    // ... (filtering logic is the same)
    
    let tableHtml = `<table><thead><tr><th><input type="checkbox" id="select-all-cb"></th>`; // Checkbox header
    displayHeaders.forEach(h => tableHtml += `<th>${h}</th>`);
    tableHtml += `<th>Receive</th></tr></thead><tbody>`;

    filteredData.forEach(row => {
        const isChecked = selection.includes(row.CODE) ? 'checked' : '';
        tableHtml += `<tr><td><input type="checkbox" class="row-cb" data-code="${row.CODE}" ${isChecked}></td>`;
        // ... (the rest of your table row generation is the same)
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table>`;
    tableContainer.innerHTML = tableHtml;
    createSummaryBtn.disabled = selection.length === 0;
}

// --- EVENT LISTENERS ---
// ... (keep initializeApp, loadFromCache, fetchAndUpdateCache, etc.)
createSummaryBtn.addEventListener('click', showSummaryView);
cancelSummaryBtn.addEventListener('click', showMainView);
submitSummaryBtn.addEventListener('click', submitSummary);

// NEW: Event delegation for summary quantity inputs
summaryPage.addEventListener('input', (event) => {
    if (event.target.classList.contains('summary-qty')) {
        updateSummaryStats();
    }
});

// MODIFIED: Event delegation for table clicks to handle checkboxes
tableContainer.addEventListener('click', function(event) {
    // Handle row checkboxes
    if (event.target.classList.contains('row-cb')) {
        const code = event.target.dataset.code;
        if (event.target.checked) {
            selection.push(code);
        } else {
            selection = selection.filter(c => c !== code);
        }
        createSummaryBtn.disabled = selection.length === 0;
    }
    // Handle "Select All" checkbox
    if (event.target.id === 'select-all-cb') {
        const isChecked = event.target.checked;
        const allVisibleCheckboxes = tableContainer.querySelectorAll('.row-cb');
        selection = []; // Clear previous selection
        if (isChecked) {
            allVisibleCheckboxes.forEach(cb => {
                selection.push(cb.dataset.code);
                cb.checked = true;
            });
        } else {
            allVisibleCheckboxes.forEach(cb => cb.checked = false);
        }
        createSummaryBtn.disabled = selection.length === 0;
    }
    // ... (your existing receive button logic)
});

// (Remember to include the rest of your JS functions: initializeApp, etc.)
