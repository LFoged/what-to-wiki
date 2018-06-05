'use strict';

// GLOBAL VARIABLES - include ref. to 'document' to min. lookup
const doc = document;
const searchForm = doc.querySelector('.search-form');
const searchInput = doc.querySelector('.search-input');
const sectionResults = doc.querySelector('.section-results');


// FUNCTION - 'helper'. Create element, assign className & other attribute
const newElement = (element, classNm, attribute=null, value=null) => {
    const newEl = doc.createElement(element);
    newEl.className = classNm;
    if (attribute && value) newEl[attribute] = value;

    return newEl;
};

// FUNCTION - uses jsonP method to make a search request
const searchWiki = (event) => {
    // Prevent page reload on form submit
    event.preventDefault();
    const query = searchInput.value;
    // Regex check to ensure input field isn't empty or filled with whitespace
    if (!query || (/^\s+$/).test(query)) {
        // Function for displaying alerts
        return showAlert('Please enter a search query');
    } else {
        // Create script tag & append to body, to make 'JSONP request' 
        const scriptTag = newElement(
            'script', 'jsonP', 'src',
            `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${query}&callback=showResults`
        );
        document.body.appendChild(scriptTag);
        // Remove 'jsonP' script tag from DOM if present, otherwise do nothing
        document.querySelector('.jsonP').remove() || false;
    }
};

// FUNCTION - Creates elements for displaying response & appends them to DOM
const showResults = (response) => {
    const data = response.query.search;
    // Check that response is not an empty Array 
    if (data.length < 1) {
        showAlert('No results found - please try another search query')
    } else {
        // document fragment - touch DOM once with all results
        const fragment = document.createDocumentFragment();
        data.map(item => {
            // <div> to hold other elements containing response text
            const resultDiv = newElement('div', 'result-div');
            // <h3> element as title for article - links to Wiki article
            const title = newElement(
                'h3', 'title', 'innerHTML', 
                `<a class="result-link" href="https://en.wikipedia.org/wiki/${item.title.replace(/\s/, '_')}" target="_blank">${item.title}</a>`
            );
            // <p> element for snippet of article 'body'
            const body = newElement(
                'p', 'result-body', 'innerHTML', `${item.snippet}...` 
            ); 
            // <p> element to display full article's length (word count)
            const wordCount = newElement(
                'p', 'result-word-count', 'innerHTML',
                `<em>Article Word Count:</em> ${item.wordcount}`
            ); 

            // Append title, body and wordCount elements to result <div>
            resultDiv.appendChild(title);
            resultDiv.appendChild(body);
            resultDiv.appendChild(wordCount);
            // Append the complete result <div> to the Document Fragment
            fragment.appendChild(resultDiv);
        });
        // Clear results form previous searches, if there are any
        while (sectionResults.hasChildNodes()) {
            sectionResults.removeChild(sectionResults.firstChild);
        }
        // Append Document Fragment to DOM - 
        sectionResults.appendChild(fragment);
    }    
};

// FUNCTION - Display error alert messages
const showAlert = (message) => {
    // <div> to display alert message & append message to <div> in a textNode
    const alertDiv = newElement('div', 'alert');
    alertDiv.appendChild(document.createTextNode(message));
    // Check whether any alerts are already in DOM - attaches alert to DOM if none
    document.querySelector('.alert') ? false : searchForm.insertBefore(alertDiv, searchInput);
    // Timeout to remove newly inserted alert from DOM after 2.5 seconds, if any alerts present
    setTimeout(() => {
        document.querySelector('.alert').remove() || false; 
    }, 2500);
}


// EventListener on 'searchForm', initializes search functionality
searchForm.addEventListener('submit', searchWiki);
