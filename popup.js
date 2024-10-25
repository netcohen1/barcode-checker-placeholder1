document.addEventListener('DOMContentLoaded', function() {
    const findSimilarButton = document.getElementById('findSimilar');
    const findAmazonButton = document.getElementById('findAmazon');
    const checkButton = document.getElementById('checkBarcode');
    const resultDiv = document.getElementById('result');
    const searchSpinner = document.getElementById('searchSpinner');

    const showSpinner = () => { searchSpinner.style.display = 'block'; resultDiv.style.display = 'none'; };
    const hideSpinner = () => { searchSpinner.style.display = 'none'; resultDiv.style.display = 'block'; };

    // Function to get all text content from the page
    const getPageText = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [pageText] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText || "",
        });
        return pageText.result;
    };

    // Find Similar Products
    findSimilarButton.addEventListener('click', async () => {
        showSpinner();
        try {
            const pageText = await getPageText();
            const response = await fetch('http://127.0.0.1:8000/api/find-similar-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: pageText })
            });
            const data = await response.json();
            if (data.similar_products) {
                resultDiv.innerHTML = 'Similar products found:<br>' + 
                    data.similar_products.map(product => 
                        `<div>${product.title} - ${product.price} - <a href="${product.link}" target="_blank">Link</a></div>`
                    ).join('');
                resultDiv.className = 'success';
            } else {
                resultDiv.textContent = 'No similar products found.';
                resultDiv.className = 'warning';
            }
        } catch (error) {
            resultDiv.className = 'error';
            resultDiv.textContent = 'Error finding similar products: ' + error.message;
        } finally {
            hideSpinner();
        }
    });

    // Find on Amazon
    findAmazonButton.addEventListener('click', async () => {
        showSpinner();
        try {
            const pageText = await getPageText();
            const response = await fetch('http://127.0.0.1:8000/api/find-on-amazon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: pageText })
            });
            const data = await response.json();
            if (data.amazon_link) {
                window.open(data.amazon_link, '_blank');
            } else {
                resultDiv.className = 'warning';
                resultDiv.textContent = 'Product not found on Amazon.';
            }
        } catch (error) {
            resultDiv.className = 'error';
            resultDiv.textContent = 'Error searching on Amazon: ' + error.message;
        } finally {
            hideSpinner();
        }
    });

    // Check Barcode
    checkButton.addEventListener('click', async () => {
        const barcode = barcodeInput.value;
        if (!/^\d{12,13}$/.test(barcode)) {
            resultDiv.className = 'error';
            resultDiv.textContent = 'Please enter a valid 12 or 13-digit barcode';
            return;
        }
        showSpinner();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/check-barcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: barcode })
            });
            const data = await response.json();
            if (data.exact_match) {
                resultDiv.className = 'success';
                resultDiv.textContent = 'Exact barcode match found!';
            } else if (data.different_barcodes && data.different_barcodes.length > 0) {
                resultDiv.className = 'error';
                resultDiv.textContent = `Warning: Different barcode found: ${data.different_barcodes[0]}`;
            } else {
                resultDiv.className = 'warning';
                resultDiv.textContent = 'No barcodes found on this page.';
            }
        } catch (error) {
            resultDiv.className = 'error';
            resultDiv.textContent = 'Error checking barcode: ' + error.message;
        } finally {
            hideSpinner();
        }
    });
});
