'use strict';

// GLOBAL VARIABLES - 'doc' = document', for brevity
const doc = document;
const searchForm = doc.querySelector('.search-form');
const searchInput = doc.querySelector('.search-input');
const newSearchBtn = doc.querySelector('.btn-new-search');
const sectionResults = doc.querySelector('.section-results');


// PERIPHERAL FUNCTIONS
// FUNCTION - create element, assign className & other attribute
const newElement = (element, classNm) => {
    const newEl = doc.createElement(element);
    newEl.className = classNm;

    return newEl;
};

// FUNCTION - remove  past results, if present - NOTE: recursion, not 'while' 
const removeChildNodes = (element) => {
    if (element.hasChildNodes()) {
        element.removeChild(element.firstChild);

        return removeChildNodes(element);
    }
};

// FUNCTION - toggle 'new-search' btn, between hidden / visible
const toggleNewSearchBtn = () => newSearchBtn.hidden = !newSearchBtn.hidden;

// FUNCTION - clear past results, hide 'new-search' button, clear & focus on input field
const newSearch = () => {
    removeChildNodes(sectionResults);
    toggleNewSearchBtn();
    searchInput.value = '';
    searchInput.focus();
};

// FUNCTION - display error alert messages
const showAlert = (message='Aww shucks! Something went wrong') => {
    const alertDiv = newElement('div', 'alert');
    alertDiv.appendChild(doc.createTextNode(message));
    // attach alert to DOM if none already present
    if (!doc.querySelector('.alert')) searchForm.insertBefore(alertDiv, searchInput);
    // Timeout to remove alert after 2.7s, if present
    setTimeout(() => {
        if (doc.querySelector('.alert')) return doc.querySelector('.alert').remove(); 
    }, 2700);
};


// CORE FUNCTIONS
// FUNCTION - check searchInput isn't empty or just whitespace(s)
const validateQueryText = (queryText) => {
    if (!queryText || (/^\s+$/).test(queryText)) {
        return showAlert('Please enter a search query');
    }

    return queryText;
};

// FUNCTION - GET data from Wikipedia => response to 'checkResponse' func.
const makeRequest = (queryText) => {
    const url = {
        origin: 'https://en.wikipedia.org',
        path: '/w/api.php',
        query: `?action=query&origin=*&list=search&format=json&srsearch=${queryText}`
    };
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${url.origin}${url.path}${url.query}`, true);
    xhr.onload = () => {
        if (xhr.status !== 200) return showAlert();
        const response = JSON.parse(xhr.responseText);
        return prepResponse(response);
    };
    xhr.onerror = error => showAlert();
    
    xhr.send();
};

// FUNCTION - check for empty response => relevant data to 'printResults' func.
const prepResponse = (rawResponse) => {
    const response = rawResponse.query;
    // clear results from past searches if any present
    if (sectionResults.hasChildNodes()) removeChildNodes(sectionResults);
    if (response.search.length > 0) {
        const data = {
            query: searchInput.value,
            results: [...response.search],
            hits: response.searchinfo.totalhits
        };

        return printResults(data);
    }
    // 'suggestion' prop. only exists if 0 hits on query & wiki has a suggestion
    if (response.searchinfo.suggestion) {
        printSuggestion(response.searchinfo.suggestion);
    }

    return showAlert(`Found no matching results for "${searchInput.value}"`);
};

// FUNCTION - print suggested query if any returned
const printSuggestion = (suggestion) => {
    const suggestDiv = newElement('div', 'suggest-div');
    const suggestQuery = newElement('span', 'suggest-query');

    suggestQuery.textContent = `${suggestion}`;
    suggestDiv.appendChild(doc.createTextNode(`Did you mean: `));
    suggestDiv.appendChild(suggestQuery);
    toggleNewSearchBtn();
    
    return sectionResults.appendChild(suggestDiv);
};

// FUNCTION - create elements to display data & append these to DOM
const printResults = (data) => {
    const query = data.query;
    const results = data.results;
    const hits = data.hits;
    // use documentFragment to only update DOM once
    const fragment = doc.createDocumentFragment();
    const resultStats = newElement('p', 'result-stats');
    resultStats.textContent = 
        `Showing ${results.length} results of ${hits} total hits for query: "${query}"`;
    fragment.appendChild(resultStats);

    results.map(result => {
        const resultDiv = newElement('div', 'result-div');
        const resultLink = newElement('a', 'result-link');      
        const resultBody = newElement('p', 'result-body');
        const resultWordCount = newElement('p', 'result-word-count');           

        resultLink.href = `https://en.wikipedia.org/wiki/${result.title.replace(/\s/, '_')}`;
        resultLink.target = "_blank";
        resultLink.textContent = result.title;
        resultBody.innerHTML = `${result.snippet}...`;
        resultWordCount.textContent = `Article Word Count: ${result.wordcount}`; 
        // Append child el.s -> resultDiv -> resultDiv to documentFragment -> fragment to DOM
        resultDiv.appendChild(resultLink);
        resultDiv.appendChild(resultBody);
        resultDiv.appendChild(resultWordCount);

        return fragment.appendChild(resultDiv);
    });
    toggleNewSearchBtn();

    return sectionResults.appendChild(fragment);
};


// FUNCTION - initialize program with eventListeners
const init = (() => {
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        // validate searchInput isn't empty. Make request if valid
        const queryText = searchInput.value.trim();
        if (validateQueryText(queryText)) return makeRequest(queryText);
    });
    newSearchBtn.addEventListener('click', newSearch);
    // 
    sectionResults.addEventListener('click', (event) => {
        if (event.target.className === ('suggest-query')) {
            const suggestQuery = doc.querySelector('.suggest-query').textContent;
            searchInput.value = suggestQuery;
            // hide 'new-search' btn so it appears when new results printed
            toggleNewSearchBtn();
            
            return makeRequest(suggestQuery);
        }
    });
})();

