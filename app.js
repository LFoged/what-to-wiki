'use strict';

/** DOM-RELATED ELEMENTS & FUNCTIONS **/
const Dom = Object.freeze({
  // DOM Elements
  els: Object.freeze({
    input: document.querySelector('.search-input'),
    newSearchBtn: document.querySelector('.btn-new-search'),
    searchSection: document.querySelector('.section__search'),
    resultSection: document.querySelector('.section__results')
  }),
  // Method - create element, assign className and attributes & values
  makeEl: (element, classNm, attr, val) => {
    const newEl = document.createElement(element);
    newEl.className = classNm;
    if (attr && val) attr.map((item, index) => newEl[item] = val[index]);
    return newEl;
  },
  // Method - append multiple child nodes to single parent element
  appendKids: (parent, children) => {
    return children.map((child) => parent.appendChild(child));
  },
  // Method - remove all child nodes of a DOM element
  removeKids: (element, removeKids) => {
    if (element.hasChildNodes()) {
      element.removeChild(element.firstChild);    
      return Dom.removeKids(element);
    }
  },
  // Method - display an alert message to DOM
  errAlert: (msg='Aww shucks! Something went wrong') => {
    const {makeEl, els} = Dom;
    if (!document.querySelector('.alert-div')) {
      const alertDiv = makeEl('div', 'alert-div');
      const message = makeEl('h3', 'alert-msg', ['textContent'], [msg]);
      alertDiv.appendChild(message);
      // Remove alertDiv from DOm after 2.7s
      els.searchSection.insertBefore(alertDiv, els.input);
      setTimeout(() => {
        document.querySelector('.alert-div').remove();
      }, 2700);
    }
  },
  // Method - print final results to DOM (both found articles & suggestions)
  print: (data, els, makeEl, appendKids) => {
    const fragment = document.createDocumentFragment();
    if (!data.articles) {
      const resultDiv = makeEl('div', 'result__div');
      const title = makeEl('h3', 'title', ['textContent'], ['Suggested: ']);
      const query = makeEl('span', 'suggest', ['textContent'], [data.suggest]);
      title.appendChild(query);
      resultDiv.appendChild(title);
      fragment.appendChild(resultDiv);
    } else {
      const {hits, queryText, articles} = data;
      const stats = makeEl('p', 'stats', ['textContent'],
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
          'span', 'more', ['textContent'],[`Find More >>`]
        );
        wordCount.appendChild(queryMore);
        appendKids(resultDiv, [title, snippet, wordCount]);
        return fragment.appendChild(resultDiv);
      });
      fragment.insertBefore(stats, fragment.firstChild);
    }
    els.newSearchBtn.hidden = false;
    els.resultSection.appendChild(fragment);
  },
  // Method - clear results, hide 'newSearchBtn' & focus on input field
  newSearch: (els, removeKids) => {
    removeKids(els.resultSection);
    els.newSearchBtn.hidden = true;
    els.input.value = '';
    els.input.focus();
  }
});


/** DATA-RELATED FUNCTIONS **/
const Data = Object.freeze({
  // Method - check that input field isn't full of whitespace
  checkInput: (input, errAlert) => {
    if (input.length > 0 && (/^\s+$/).test(input)) {
      return errAlert('Please enter a search query');
    }
    return input.trim();
  },
  // Method - fetch (GET request) data from Wikipedia API for query text
  makeRequest: (queryText, errAlert) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&list=search&format=json&srsearch=${queryText}`;
    return fetch(url, {mode: 'cors'})
      .then(response => response.json())
      .catch(err => errAlert());
  },
  // Method - check response from request & extract relevant data 
  filterResponse: (response) => {
    const hits = response.searchinfo.totalhits;
    const articles = response.search;
    const suggest = response.searchinfo.suggestion;
    if (articles.length < 1 && suggest) return {hits, suggest};
    return {hits, articles};
  }
});


// Function - initializes program => eventListeners & main control function 
const init = (() => {
  const {els, makeEl, appendKids, removeKids, errAlert, print, newSearch} = Dom;
  const {checkInput, makeRequest, filterResponse} = Data;
  // Function - main controller function
  const ctrl = async (input) => {
    const queryText = checkInput(input, errAlert);
    if (queryText) {
      const rawResponse = await makeRequest(queryText, errAlert);
      const data = filterResponse(rawResponse.query);
      if (data.hits < 1) errAlert(`No results for "${queryText}"`);
      removeKids(els.resultSection);
      print({...data, queryText}, els, makeEl, appendKids);
    }
  };

  // Event-listeners (the magic starts here)
  els.input.addEventListener('keyup', (e) => ctrl(e.target.value));
  els.newSearchBtn.addEventListener('click', () => newSearch(els, removeKids));
  els.resultSection.addEventListener('click', (e) => {
    if (e.target.className === 'suggest' || e.target.className === 'more') {
      let text;
      e.target.className === 'more' 
        ? text = e.target.parentElement.parentElement.firstChild.textContent
        : text = e.target.textContent;
      els.input.value = text;
      ctrl(text);
    }
  });
})();