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
  // Method - create elements, assign classNames & attributes and values
  makeEl: (rawElArray) => {
    return rawElArray.map((rawEl) => {
      const {el, cls, attr, val} = rawEl;
      const newEl = document.createElement(el);
      newEl.className = cls;
      if (attr && val) attr.map((item, index) => newEl[item] = val[index]);

      return newEl;
    });  
  },
  // Method - append multiple child nodes to single parent element
  appendKids: (parent, children) => {
    return children.map((child) => parent.appendChild(child));
  },
  // Method - remove all child nodes of a DOM element
  removeKids: (element) => {
    if (element.hasChildNodes()) {
      element.removeChild(element.firstChild);

      return Dom.removeKids(element);
    }
  },
  // Method - display an alert message to DOM
  errAlert: (msg='Aww shucks! Something went wrong') => {
    const {makeEl, els} = Dom;
    if (!document.querySelector('.alert-div')) {
      const [alertDivEl, messageEl] = makeEl([
        {el: 'div', cls: 'alert-div'},
        {el: 'h3', cls: 'alert-msg', attr: ['textContent'], val: [msg]}
      ]);
      alertDivEl.appendChild(messageEl);
      // Remove alertDiv from DOM after 2.7s
      els.searchSection.insertBefore(alertDivEl, els.input);
      setTimeout(() => {
        document.querySelector('.alert-div').remove();
      }, 2700);
    }
  },
  // Method - print final results to DOM (both found articles & suggestions)
  print: (data, els, makeEl, appendKids) => {
    const {hits, queryText, articles, suggest} = data;
    // results appended to document fragment later, so DOM only touched once
    const fragment = document.createDocumentFragment();
    // Function - create <p> displaying stats for returned articles
    const prepStats = (hits, queryText, numArticles) => {
      return makeEl([
        {
          el: 'p', cls: 'stats', attr: ['textContent'],
          val: [`Showing ${numArticles} of ${hits} hits for "${queryText}"`]
        }
      ]);
    };
    // Function - create <div> containing 'suggestion'
    const prepSuggestion = (suggest, makeEl) => {
      const [resultDivEl, titleEl, queryEl] = makeEl([
        {el: 'div', cls: 'result__div'},
        {el: 'h3', cls: 'title', attr: ['textContent'], val: ['Suggested: ']},
        {el: 'span', cls: 'query-sug', attr: ['textContent'], val: [suggest]}
      ]);
      titleEl.appendChild(queryEl);
      resultDivEl.appendChild(titleEl);

      return resultDivEl;
    };
    // Function - create <div> containing data for received article
    const prepArticle = (article) => (makeEl, appendKids) => {
      const articleLink = `https://en.wikipedia.org/wiki/${article.title.replace(/\s/, '_')}`;
      const [resultDivEl, titleEl, snippetEl, wordCountEl, queryEl] = makeEl([
        {el: 'div', cls: 'result__div'},
        {
          el: 'a', cls: 'title article-link',
          attr: ['href', 'target', 'textContent'],
          val: [articleLink, '_blank', article.title]
        },
        {
          el: 'p', cls: 'snippet', attr: ['innerHTML'],
          val: [`${article.snippet}...`]},
        {
          el: 'p', cls: 'word-count', attr: ['textContent'],
          val: [`Article Word Count: ${article.wordcount}`]
        },
        {el:'span', cls:'query-art', attr:['textContent'], val:[`Find More >>`]}
      ]);  
      wordCountEl.appendChild(queryEl);
      appendKids(resultDivEl, [titleEl, snippetEl, wordCountEl]);

      return resultDivEl;
    };
    // prep & print, either 'suggestion' or 'articles' & append to fragment
    const [stats] = prepStats(hits, queryText, articles.length);
    if (suggest) {
      fragment.appendChild(prepSuggestion(suggest, makeEl));
    } else {
      // prep articles to be appended to fragment
      const resultEls = articles.map(article => {
        return prepArticle(article)(makeEl, appendKids);
      });
      appendKids(fragment, resultEls);
    }
    fragment.insertBefore(stats, fragment.firstChild);
    els.newSearchBtn.hidden = false;

    return els.resultSection.appendChild(fragment);
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
    if (articles.length < 1 && suggest) return {hits, articles, suggest};

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
      if (els.resultSection.hasChildNodes()) removeKids(els.resultSection);
      
      return print({...data, queryText}, els, makeEl, appendKids);
    }
  };
  // Event-listeners (the magic starts here)
  els.input.addEventListener('keyup', (e) => ctrl(e.target.value));
  els.newSearchBtn.addEventListener('click', () => newSearch(els, removeKids));
  els.resultSection.addEventListener('click', (e) => {
    if (e.target.className.includes('query')) {
      const currentInput = els.input.value.trim();
      const newInput = e.target.className.includes('art') 
        ? e.target.parentElement.parentElement.firstChild.textContent
        : e.target.textContent;
      // only proceed if 'text' is different from current 'input.value'
      if (currentInput === newInput) return null;
      els.input.value = newInput;
      ctrl(newInput);
    }
  });
})();
