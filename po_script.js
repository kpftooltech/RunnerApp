document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const API_URL = 'https://script.google.com/macros/s/AKfycby65GNMnpg1PZgNwm1eagPC_7wFhKktPyQSHSTlbUlFybiV3_EJ43nX-Rn_2MmGLkQF/exec'; 

    // --- STATE ---
    let allPoData = []; 
    let displayHeaders = []; 
    let selection = [];

    // --- DOM ELEMENTS ---
    const mainPage = document.getElementById('main-page');
    const summaryPage = document.getElementById('summary-page');
    const createSummaryBtn = document.getElementById('create-summary-btn');
    const submitSummaryBtn = document.getElementById('submit-summary-btn');
    const cancelSummaryBtn = document.getElementById('cancel-summary-btn');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const tableContainer = document.getElementById('table-container');
    const loadingBarContainer = document.getElementById('loading-bar-container');
    const loadingBar = document.getElementById('loading-bar');

    // --- RENDER TABLE (CORRECTED) ---
    function renderTable(data) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let filteredData = [...data];

        if (searchTerm) {
            filteredData = data.filter(row => 
                Object.values(row).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                )
            );
        }
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
        // REMOVED: Checkbox header is gone.
        displayHeaders.forEach(h => tableHtml += `<th>${h}</th>`);
        // REMOVED: Receive header is gone.
        tableHtml += `</tr></thead><tbody>`;

        const highlightRegex = searchTerm ? new RegExp(`(${searchTerm})`, 'gi') : null;

        filteredData.forEach(row => {
            const isSelected = selection.includes(row.CODE) ? 'selected-row' : '';
            // Add data-code directly to the row for click handling
            tableHtml += `<tr class="${isSelected}" data-code="${row.CODE}">`; 
            // REMOVED: Checkbox cell is gone.
            
            displayHeaders.forEach(header => {
                let value = row[header] === undefined ? '' : row[header];
                if ((header === 'PO Date' || header === 'Material In Date') && value) {
                    value = new Date(value).toLocaleDateString();
                }
                let displayValue = String(value);
                if (highlightRegex) {
                    displayValue = displayValue.replace(highlightRegex, `<mark>$1</mark>`);
                }
                tableHtml += `<td data-label="${header}">${displayValue}</td>`;
            });

            // REMOVED: The entire "Receive" cell (input and button) is gone.
            tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableContainer.innerHTML = tableHtml;
    }

    // --- EVENT LISTENERS (CORRECTED) ---
    searchInput.addEventListener('input', () => renderTable(allPoData));
    statusFilter.addEventListener('change', () => renderTable(allPoData));
    createSummaryBtn.addEventListener('click', showSummaryView);
    cancelSummaryBtn.addEventListener('click', showMainView);
    submitSummaryBtn.addEventListener('click', submitSummary);
    summaryPage.addEventListener('input', (event) => {
        if (event.target.classList.contains('summary-qty')) updateSummaryStats();
    });
    
    // Simplified event listener for row clicks ONLY
    tableContainer.addEventListener('click', function(event) {
        const clickedRow = event.target.closest('tr');
        if (!clickedRow || !clickedRow.dataset.code) return; 

        const code = clickedRow.dataset.code;
        
        // Toggle selection logic
        const index = selection.indexOf(code);
        if (index > -1) {
            selection.splice(index, 1); // Deselect
            clickedRow.classList.remove('selected-row');
        } else {
            selection.push(code); // Select
            clickedRow.classList.add('selected-row');
        }

        createSummaryBtn.disabled = selection.length === 0;
    });

    // --- UNCHANGED HELPER FUNCTIONS ---
    // (The rest of the functions are included below for a complete file)
    function showSummaryView() { generateSummaryList(); mainPage.style.display = 'none'; summaryPage.style.display = 'block'; }
    function showMainView() { selection = []; if(createSummaryBtn) createSummaryBtn.disabled = true; mainPage.style.display = 'block'; summaryPage.style.display = 'none'; renderTable(allPoData); }
    function generateSummaryList() { const summaryList = document.getElementById('summary-list'); const selectedItems = allPoData.filter(item => selection.includes(item.CODE)); if (selectedItems.length === 0) { summaryList.innerHTML = `<p class="loader">No items selected.</p>`; return; } let html = ''; selectedItems.forEach(item => { html += `<div class="summary-item" data-code="${item.CODE}"><div class="summary-item-info"><p class="code">${item.CODE} - ${item.ITEM}</p><p class="desc">Ordered: ${item.QTY}, Previously Received: ${item['Qty Received']}</p></div><input type="number" class="summary-qty" value="1" min="0" placeholder="Qty Today"></div>`; }); summaryList.innerHTML = html; updateSummaryStats(); }
    function updateSummaryStats() { const qtyInputs = document.querySelectorAll('.summary-qty'); let totalItems = 0; let totalQty = 0; qtyInputs.forEach(input => { const qty = parseInt(input.value, 10) || 0; if (qty > 0) { totalItems++; totalQty += qty; } }); document.getElementById('total-items').textContent = totalItems; document.getElementById('total-qty').textContent = totalQty; }
    async function submitSummary() { submitSummaryBtn.disabled = true; submitSummaryBtn.textContent = 'Submitting...'; const itemsToUpdate = []; document.querySelectorAll('.summary-item').forEach(item => { const qty = parseInt(item.querySelector('.summary-qty').value, 10) || 0; if (qty > 0) { itemsToUpdate.push({ code: item.dataset.code, qtyReceived: qty }); } }); if (itemsToUpdate.length === 0) { alert("Please enter a quantity for at least one item."); submitSummaryBtn.disabled = false; submitSummaryBtn.textContent = 'Submit Delivery'; return; } try { await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'bulkUpdate', items: itemsToUpdate }) }); alert("Delivery summary submitted successfully! Data will now refresh."); localStorage.removeItem('poCache'); showMainView(); initializeApp(); } catch(error) { alert(`Error submitting summary: ${error.message}`); } finally { submitSummaryBtn.disabled = false; submitSummaryBtn.textContent = 'Submit Delivery'; } }
    function showLoadingBar() { loadingBarContainer.style.display = 'block'; loadingBar.style.width = '0%'; setTimeout(() => { loadingBar.style.width = '85%'; }, 50); }
    function hideLoadingBar() { loadingBar.style.width = '100%'; setTimeout(() => { loadingBarContainer.style.display = 'none'; }, 1600); }
    async function fetchAndUpdateCache() { showLoadingBar(); try { const response = await fetch(API_URL); if (!response.ok) throw new Error(`Network response was not ok (${response.status})`); const freshData = await response.json(); const freshDataString = JSON.stringify(freshData); const cachedDataString = localStorage.getItem('poCache'); if (freshDataString !== cachedDataString) { allPoData = freshData.poData; displayHeaders = freshData.displayHeaders; renderTable(allPoData); localStorage.setItem('poCache', freshDataString); } else if (allPoData.length === 0 && displayHeaders.length === 0){ allPoData = freshData.poData; displayHeaders = freshData.displayHeaders; renderTable(allPoData); } } catch (error) { if (allPoData.length === 0) tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`; } finally { hideLoadingBar(); } }
    function loadFromCache() { const cachedResponse = localStorage.getItem('poCache'); if (cachedResponse) { const cachedData = JSON.parse(cachedResponse); allPoData = cachedData.poData; displayHeaders = cachedData.displayHeaders; renderTable(allPoData); return true; } return false; }
    function initializeApp() { if (!loadFromCache()) { tableContainer.innerHTML = `<p class="loader">Fetching fresh data...</p>`; } fetchAndUpdateCache(); }

    // --- INITIALIZE THE APP ---
    initializeApp();
});
