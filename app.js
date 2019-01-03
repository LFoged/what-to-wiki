'use strict';

/* 'UTILITY' FUNCTIONS */
const UTILS = (() => {
  const _doc = document;

  // create elements, assign classNames & attributes and values
  const makeEl = (rawElArray) => {
    return rawElArray.map((rawEl) => {
      const {el, cls, attr, val} = rawEl;
      const newEl = _doc.createElement(el);
      newEl.className = cls;
      if (attr && val) attr.map((item, index) => newEl[item] = val[index]);

      return newEl;
    });  
  };

  // append multiple child nodes to single parent element
  const appendKids = (parent, children) => {
    return children.map((child) => parent.appendChild(child));
  };

  // remove all child nodes of a DOM element
  const removeKids = (element) => {
    if (element.hasChildNodes()) {
      element.removeChild(element.firstChild);

      return UTILS.removeKids(element);
    }
  };

  return Object.freeze({ makeEl, appendKids, removeKids });
})();


/* FUNCTIONS THAT DIRECTLY DEAL WITH / TOUCH DOM */
const DOM = ((UTILS) => {
  const {makeEl, appendKids, removeKids} = UTILS;

  const _doc = document;
  const _templates = Object.freeze({
    alert: (msg) => {
      const [alertDivEl, messageEl] = makeEl([
        {el: 'div', cls: 'alert-div'},
        {el: 'h3', cls: 'alert-msg', attr: ['textContent'], val: [msg]}
      ]);
      alertDivEl.appendChild(messageEl);

      return alertDivEl;
    },
    articleStats: (hits, queryText, numArticles) => {
      const [stats] = makeEl([
        {
          el: 'p',
          cls: 'stats',
          attr: ['textContent'],
          val: [`Showing ${numArticles} of ${hits} hits for "${queryText}"`]
        }
      ]);

      return stats; 
    },
    article: (article) => {
      const articleLink = `https://en.wikipedia.org/wiki/${article.title.replace(/\s/, '_')}`;
      const [resultDivEl, titleEl, snippetEl, wordCountEl, queryEl] = makeEl([
        {el: 'div', cls: 'result__div'},
        {
          el: 'a',
          cls: 'title article-link',
          attr: ['href', 'target', 'textContent'],
          val: [articleLink, '_blank', article.title]
        },
        {
          el: 'p',
          cls: 'snippet',
          attr: ['innerHTML'],
          val: [`${article.snippet}...`]},
        {
          el: 'p',
          cls: 'word-count',
          attr: ['textContent'],
          val: [`Article Word Count: ${article.wordcount}`]
        },
        {el:'span', cls:'query-art', attr:['textContent'], val:[`Find More >>`]}
      ]);  
      wordCountEl.appendChild(queryEl);
      appendKids(resultDivEl, [titleEl, snippetEl, wordCountEl]);

      return resultDivEl;
    },
    suggestion: (suggest) => {
      const [resultDivEl, titleEl, queryEl] = makeEl([
        {el: 'div', cls: 'result__div'},
        {el: 'h3', cls: 'title', attr: ['textContent'], val: ['Suggested: ']},
        {el: 'span', cls: 'query-sug', attr: ['textContent'], val: [suggest]}
      ]);
      titleEl.appendChild(queryEl);
      resultDivEl.appendChild(titleEl);

      return resultDivEl;
    }
  });

  // DOM elements
  const els = Object.freeze({
    main: _doc.querySelector('.main'),
    container: _doc.querySelector('.container'),
    input: _doc.querySelector('.search-input'),
    newSearchBtn: _doc.querySelector('.btn-new-search'),
    resultSection: _doc.querySelector('.section__results')
  });

  // print stats & articles or suggestions
  const print = (data) => {
    const {hits, queryText, articles, suggest} = data;

    const fragment = _doc.createDocumentFragment();
    // create relevant templates & append to fragment
    const stats = _templates.articleStats(hits, queryText, articles.length);
    if (suggest) {
      fragment.appendChild(_templates.suggestion(suggest));
    } else {
      const resultEls = articles.map(data => {
        return _templates.article(data);
      });
      appendKids(fragment, resultEls);
    }
    fragment.insertBefore(stats, fragment.firstChild);
    // display 'new search' btn & clear past results before appending new ones
    els.newSearchBtn.hidden = false;
    if (els.resultSection.hasChildNodes()) removeKids(els.resultSection);

    return els.resultSection.appendChild(fragment);
  };

  // display an alert message to DOM
  const errAlert = (msg='Aww shucks! Something went wrong') => {
    if (!_doc.querySelector('.alert-div')) {
      const removeDelay = 2700;
      const alert = _templates.alert(msg);
      els.main.insertBefore(alert, els.container);
      // remove alert from DOM & remove after x secs
      setTimeout(() => {
        _doc.querySelector('.alert-div').remove();
      }, removeDelay);
    }
  };

  return Object.freeze({ els, print, errAlert });
})(UTILS);


/* FUNCTIONS FOR GETTING & FILTERING DATA */
const DATA = (() => {
  // fetch data from Wikipedia API
  const makeRequest = (queryText) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&list=search&format=json&srsearch=${queryText}`;

    return fetch(url, {mode: 'cors'}).then(response => response.json());
  };

  // check response from request & extract relevant data 
  const filterResponse = (response) => {
    const hits = response.searchinfo.totalhits;
    const articles = response.search;
    const suggest = response.searchinfo.suggestion;
    if (articles.length < 1 && suggest) return {hits, articles, suggest};

    return {hits, articles};
  };

  return Object.freeze({ makeRequest, filterResponse });
})();


/* 'PERIPHERAL' FUNCTIONS - don't directly deal with data / DOM */
const AUX = ((removeKids, els) => {
  const {resultSection, newSearchBtn, input} = els;

  // check input field isn't empty / just whitespace
  const validateInput = (input) => {
    return (input.length > 0 && (/^\s+$/).test(input)) ? false : input.trim();
  };

  // clear results, hide 'newSearchBtn' & put focus on input field
  const newSearch = () => {
    removeKids(resultSection);
    newSearchBtn.hidden = true;
    input.value = '';
    input.focus();
  };

  return Object.freeze({ validateInput, newSearch });
})(UTILS.removeKids, DOM.els);


/* INITIALIZE PROGRAM - main control & event listeners */
const init = ((DOM, DATA, AUX) => {
  const {els, errAlert, print} = DOM;
  const {makeRequest, filterResponse} = DATA;
  const {validateInput, newSearch} = AUX;

  // main controller function
  const ctrl = async (input) => {
    const queryText = validateInput(input);
    if (!queryText) return errAlert('Please enter a search query');
    try {
      const rawResponse = await makeRequest(queryText);
      const data = filterResponse(rawResponse.query);
      if (data.hits < 1) errAlert(`No results for "${queryText}"`);
      print({...data, queryText});
    } catch (error) {
      errAlert();
    }
  };

  // event-listeners
  els.input.addEventListener('keyup', (e) => ctrl(e.target.value));
  els.newSearchBtn.addEventListener('click', () => newSearch());
  els.resultSection.addEventListener('click', (e) => {
    if (e.target.className.includes('query')) {
      const currentInput = els.input.value.trim();
      const newInput = e.target.className.includes('art') 
        ? e.target.parentElement.parentElement.firstChild.textContent
        : e.target.textContent;
      // only make new search if 'text' !== current 'input.value'
      if (currentInput === newInput) return null;
      els.input.value = newInput;
      ctrl(newInput);
    }
  });
})(DOM, DATA, AUX);
