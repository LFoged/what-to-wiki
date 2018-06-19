'use strict';

/** DOM RELATED ELEMENTS & FUNCTIONS (methods) **/
const dom = Object.freeze({
  elements: Object.freeze({
    input: document.querySelector('.search-input'),
    newSearchBtn: document.querySelector('.btn-new-search'),
    searchSection: document.querySelector('.section__search'),
    resultSection: document.querySelector('.section__results')
  }),

  // Method - create element, assign className and attributes & values
  makeEl: (element, classNm, attr=undefined, val=undefined) => {
    const newEl = document.createElement(element);
    newEl.className = classNm;
    if (attr && val) attr.map((item, index) => newEl[item] = val[index]);
  
    return newEl;
  },

  appendChildren: (parent, children) => {
    return children.map((child) => parent.appendChild(child));
  },

  // Method - remove all child nodes of a DOM element
  removeChildren: (element) => {
    if (element.hasChildNodes()) {
      element.removeChild(element.firstChild);
      
      return dom.removeChildren(element);
    }
  },

  // Method - add an alert message to DOM
  showAlert: (msg='Aww shucks! Something went wrong') => {
    if (!document.querySelector('.alert-div')) {
      const alertDiv = dom.makeEl('div', 'alert-div');
      const message = dom.makeEl('h3', 'alert-msg', ['textContent'], [msg]);
      alertDiv.appendChild(message);

      dom.elements.searchSection.insertBefore(alertDiv, dom.elements.input);
      setTimeout(() => {
        document.querySelector('.alert-div').remove();
      }, 2700);
    }
  },

  printResults: (data, makeEl, appendChildren) => {
    const fragment = document.createDocumentFragment();

    if (!data.articles) {
      const resultDiv = makeEl('div', 'result__div');
      const title = makeEl('h3', 'title', ['textContent'], ['Suggested: ']);
      const query = makeEl('span', 'suggest', ['textContent'], [data.suggest]);
      title.appendChild(query);
      resultDiv.appendChild(title);
      fragment.appendChild(resultDiv);
    } else {
      const { hits, queryText, articles } = data;
      const stats = dom.makeEl('p', 'stats', ['textContent'],
        [`Showing ${articles.length} of ${hits} hits for "${queryText}"`]
      );

      articles.map((article) => {
        const resultDiv = makeEl('div', 'result__div');
        const hrefEnd = article.title.replace(/\s/, '_');
        const title = makeEl(
          'a', 'title article-link query', ['href', 'target', 'textContent'],[`https://en.wikipedia.org/wiki/${hrefEnd}`,'_blank', article.title]
        );
        const snippet = makeEl(
          'p', 'snippet', ['innerHTML'], [`${article.snippet}...`]
        );
        const wordCount = makeEl(
          'p', 'word-count', ['textContent'], 
          [`Article Word Count: ${article.wordcount}`]
        );
        const queryMore = makeEl(
          'span', 'find-more', ['textContent'],[`Find More >>`]
        );

        wordCount.appendChild(queryMore);
        appendChildren(resultDiv, [title, snippet, wordCount]);
        
        return fragment.appendChild(resultDiv);
      });

      fragment.insertBefore(stats, fragment.firstChild);
    }

    dom.elements.newSearchBtn.hidden = false;
    dom.elements.resultSection.appendChild(fragment);
  },

  newSearch: () => {
    dom.removeChildren(dom.elements.resultSection);
    dom.elements.newSearchBtn.hidden = true;
    dom.elements.input.value = '';
    dom.elements.input.focus();
  }
});


/** CORE FUNCTIONS **/
// Function - check queryText not blank / whitespace
const checkInput = (inputText, alerter) => {
  if (inputText.length > 0 && (/^\s+$/).test(inputText)) {
    return alerter('Please enter a search query');
  }

  return inputText.trim();
};

// Function - fetch data from Wikipedia API for query text
const makeRequest = (queryText, alerter) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&list=search&format=json&srsearch=${queryText}`;
  try {
    return fetch(url, {mode: 'cors'}).then(response => response.json());
  } catch (err) {
    return alerter('Bummer! Problem with the request');
  }  
};

// Function - Check whether any data returned
const filterResponse = (response) => {
  const hits = response.searchinfo.totalhits;
  const articles = response.search;
  const suggest = response.searchinfo.suggestion;
  if (articles.length < 1 && suggest) return {hits, suggest};
  
  return {hits, articles};
};


// Function - main controller function
const ctrl = async (text, checkText, makeRequest, filter, dom) => {
  const queryText = checkText(text, dom.showAlert);
  if (queryText) {
    const rawResponse = await makeRequest(queryText, dom.showAlert);
    const data = filter(rawResponse.query);
    if (data.hits < 1) dom.showAlert(`No results for "${queryText}"`);
    dom.removeChildren(dom.elements.resultSection);
    dom.printResults({...data, queryText}, dom.makeEl, dom.appendChildren);
  }
};

// Event listeners
dom.elements.input.addEventListener('keyup', (e) => {
  ctrl(e.target.value, checkInput, makeRequest, filterResponse, dom)
});
dom.elements.newSearchBtn.addEventListener('click', dom.newSearch);
dom.elements.resultSection.addEventListener('click', (e) => {
  if (e.target.className === 'suggest' || e.target.className === 'find-more') {
    let text;
    e.target.className === 'find-more' 
      ? text = e.target.parentElement.parentElement.firstChild.textContent
      : text = e.target.textContent;
    dom.elements.input.value = text;
    ctrl(text, checkInput, makeRequest, filterResponse, dom);
  }
});
