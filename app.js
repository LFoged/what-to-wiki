'use strict';


/** 
 * TODO: 
 * 'Suggested query' button / search if no results. 
 * 'clear search' / 'new search button'
*/


// GLOBAL VARIABLES - include ref. to 'document' to min. lookup
const doc = document;
const searchForm = doc.querySelector('.search-form');
const searchInput = doc.querySelector('.search-input');
const sectionResults = doc.querySelector('.section-results');


// PERIPHERAL FUNCTIONS
// FUNCTION - create element, assign className & other attribute
const newElement = (element, classNm) => {
    const newEl = doc.createElement(element);
    newEl.className = classNm;

    return newEl;
};

// FUNCTION - clear past result from DOM, if present
const clearPastResults = () => {
    while (sectionResults.hasChildNodes()) {
        sectionResults.removeChild(sectionResults.firstChild);
    }
};

// FUNCTION - display error alert messages
const showAlert = (message='Aww shucks! Something went wrong') => {
    const alertDiv = newElement('div', 'alert');
    alertDiv.appendChild(doc.createTextNode(message));
    // attach alert to DOM if none already present
    if (!doc.querySelector('.alert')) searchForm.insertBefore(alertDiv, searchInput);
    // Timeout to remove alert after 2.5 seconds, if present
    setTimeout(() => {
        if (doc.querySelector('.alert')) return doc.querySelector('.alert').remove(); 
    }, 2500);
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
        return checkResponse(response);
    };
    xhr.onerror = error => showAlert();
    
    xhr.send();
};

// FUNCTION - check for empty response => relevant data to 'printResults' func.
const checkResponse = (rawResponse) => {
    const data = rawResponse.query.search;
    if (data.length < 1) {
        return showAlert('No results found - please try another search query')
    }
    return printResults(data);
};

// // FUNCTION - create elements to display data & append these to DOM
const printResults = (data) => {
    // use documentFragment to only update DOM once
    const fragment = doc.createDocumentFragment();

    data.map(item => {
        const resultDiv = newElement('div', 'result-div');
        const resultTitle = newElement('h3', 'title');
        const resultLink = newElement('a', 'result-link');      
        const resultBody = newElement('p', 'result-body');
        const resultWordCount = newElement('p', 'result-word-count');           

        resultLink.href = `https://en.wikipedia.org/wiki/${item.title.replace(/\s/, '_')}`;
        resultLink.target = "_blank";
        resultLink.textContent = item.title;

        resultBody.innerHTML = `${item.snippet}...`;
        resultWordCount.innerHTML = `<em>Article Word Count:</em> ${item.wordcount}`; 

        resultTitle.appendChild(resultLink);
        resultDiv.appendChild(resultTitle);
        resultDiv.appendChild(resultBody);
        resultDiv.appendChild(resultWordCount);
        // Append resultDiv to documentFragment
        fragment.appendChild(resultDiv);
    });

    // Clear past search results if any & append Document Fragment to DOM
    if (sectionResults.hasChildNodes()) clearPastResults();
    sectionResults.appendChild(fragment);
};


// EventListener on 'searchForm'. Initializes program
searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    // validate searchInput isn't empty. Make request if valid
    const queryText = searchInput.value;
    if (validateQueryText(queryText)) return makeRequest(queryText);
});
