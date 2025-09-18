// This wrapper ensures the entire script runs only after the HTML page is fully loaded.
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

    // --- VIEW MANAGEMENT ---
    function showSummaryView() {
        generateSummaryList();
        mainPage.style.display = 'none';
        summaryPage.style.display = 'block';
    }

    function showMainView() {
        selection = [];
        if(createSummaryBtn) createSummaryBtn.disabled = true;
        mainPage.style.display = 'block';
        summaryPage.style.display = 'none';
        renderTable(allPoData);
    }
    
    // --- SUMMARY PAGE LOGIC ---
    function generateSummaryList() {
        const summaryList = document.getElementById('summary-list');
        const selectedItems = allPoData.filter(item => selection.includes(item.CODE));
        
        if (selectedItems.length === 0) {
            summaryList.innerHTML = `<p class="loader">No items selected.</p>`;
            return;
        }
        
        let html = '';
        selectedItems.forEach(item => {
            html += `
                <div class="summary-item" data-code="${item.CODE}">
                    <div class="summary-item-info">
                        <p class="code">${item.CODE} - ${item.ITEM}</p>
                        <p class="desc">Ordered: ${item.QTY}, Previously Received: ${item['Qty Received']}</p>
                    </div>
                    <input type="number" class="summary-qty" value="1" min="0" placeholder="Qty Today">
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
        document.querySelectorAll('.summary-item').forEach(item => {
            const qty = parseInt(item.querySelector('.summary-qty').value, 10) || 0;
            if (qty > 0) {
                itemsToUpdate.push({ code: item.dataset.code, qtyReceived: qty });
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
                body: JSON.stringify({ action: 'bulkUpdate', items: itemsToUpdate })
            });
            alert("Delivery summary submitted successfully! Data will now refresh.");
            localStorage.removeItem('poCache');
            showMainView();
            initializeApp();
        } catch(error) {
            alert(`Error submitting summary: ${error.message}`);
        } finally {
            submitSummaryBtn.disabled = false;
            submitSummaryBtn.textContent = 'Submit Delivery';
        }
    }

    // --- RENDER TABLE ---
    function renderTable(data) {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredData = searchTerm
            ? data.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(searchTerm)))
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

        let tableHtml = `<table><thead><tr><th><input type="checkbox" id="select-all-cb"></th>`;
        displayHeaders.forEach(h => tableHtml += `<th>${h}</th>`);
        tableHtml += `<th>Receive</th></tr></thead><tbody>`;

        filteredData.forEach(row => {
            const isChecked = selection.includes(row.CODE) ? 'checked' : '';
            tableHtml += `<tr><td><input type="checkbox" class="row-cb" data-code="${row.CODE}" ${isChecked}></td>`;
            displayHeaders.forEach(header => {
                let value = row[header] === undefined ? '' : row[header];
                if ((header === 'PO Date' || header === 'Material In Date') && value) {
                    value = new Date(value).toLocaleDateString();
                }
                tableHtml += `<td data-label="${header}">${value}</td>`;
            });
            tableHtml += `
                <td data-label="Receive" class="receive-cell">
                    <input type="number" class="receive-qty" value="1" min="1">
                    <button class="receive-btn" data-code="${row.CODE}">Receive</button>
                </td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableContainer.innerHTML = tableHtml;
    }

    // --- CORE APP LOGIC ---
    function showLoadingBar() {
        loadingBarContainer.style.display = 'block';
        loadingBar.style.width = '0%';
        setTimeout(() => { loadingBar.style.width = '85%'; }, 50); 
    }

    function hideLoadingBar() {
        loadingBar.style.width = '100%';
        setTimeout(() => { loadingBarContainer.style.display = 'none'; }, 1600); 
    }

    async function fetchAndUpdateCache() {
        showLoadingBar();
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            
            const freshData = await response.json();
            const freshDataString = JSON.stringify(freshData);
            const cachedDataString = localStorage.getItem('poCache');

            if (freshDataString !== cachedDataString) {
                allPoData = freshData.poData;
                displayHeaders = freshData.displayHeaders;
                renderTable(allPoData);
                localStorage.setItem('poCache', freshDataString);
            }
        } catch (error) {
            if (allPoData.length === 0) tableContainer.innerHTML = `<p class="loader" style="color: red;">Error: ${error.message}</p>`;
        } finally {
            hideLoadingBar();
        }
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
            alert(`Error updating PO: ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Receive';
        }
    }

    function loadFromCache() {
        const cachedResponse = localStorage.getItem('poCache');
        if (cachedResponse) {
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
    searchInput.addEventListener('input', () => renderTable(allPoData));
    statusFilter.addEventListener('change', () => renderTable(allPoData));
    createSummaryBtn.addEventListener('click', showSummaryView);
    cancelSummaryBtn.addEventListener('click', showMainView);
    submitSummaryBtn.addEventListener('click', submitSummary);
    summaryPage.addEventListener('input', (event) => {
        if (event.target.classList.contains('summary-qty')) updateSummaryStats();
    });
    tableContainer.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('row-cb')) {
            const code = target.dataset.code;
            if (target.checked) {
                if (!selection.includes(code)) selection.push(code);
            } else {
                selection = selection.filter(c => c !== code);
            }
            const allVisibleCheckboxes = tableContainer.querySelectorAll('.row-cb');
            document.getElementById('select-all-cb').checked = allVisibleCheckboxes.length > 0 && allVisibleCheckboxes.length === selection.length;
            createSummaryBtn.disabled = selection.length === 0;
        } else if (target.id === 'select-all-cb') {
            const isChecked = target.checked;
            const allVisibleCheckboxes = tableContainer.querySelectorAll('.row-cb');
            selection = [];
            if (isChecked) {
                allVisibleCheckboxes.forEach(cb => {
                    selection.push(cb.dataset.code);
                    cb.checked = true;
                });
            } else {
                allVisibleCheckboxes.forEach(cb => cb.checked = false);
            }
            createSummaryBtn.disabled = selection.length === 0;
        } else if (target.classList.contains('receive-btn')) {
            const button = target;
            const code = button.dataset.code;
            const qtyInput = button.closest('.receive-cell').querySelector('.receive-qty');
            const quantity = parseInt(qtyInput.value, 10);
            if (quantity > 0) receiveItem(code, quantity);
            else alert('Please enter a quantity greater than 0.');
        }
    });

    // --- INITIALIZE THE APP ---
    initializeApp();
});
