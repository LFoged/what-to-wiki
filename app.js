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

  // append multiple child nodes to single parent element (outside DOM)
  const appendKids = (parent, children) => {
    return children.map((child) => parent.appendChild(child));
  };

  // check input isn't empty / just whitespace
  const validateInput = (input) => {
    return (input.length > 0 && (/^\s+$/).test(input)) ? false : input.trim();
  };

  return Object.freeze({ makeEl, appendKids, validateInput });
})();


/* FUNCTIONS THAT DIRECTLY DEAL WITH / TOUCH DOM */
const DOM = ((UTILS) => {
  const {makeEl, appendKids} = UTILS;

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
  
  // remove an element from DOM after delay - used by 'alertCtrl'
  const _delayedRemoveEl = (elQuerySelector, delayInMs) => {
    return setTimeout(() => {
      _doc.querySelector(elQuerySelector).remove();
    }, delayInMs);
  };

  // DOM elements
  const els = Object.freeze({
    alertSection: _doc.querySelector('.section__alert'),
    input: _doc.querySelector('.search-input'),
    newSearchBtn: _doc.querySelector('.btn-new-search'),
    resultSection: _doc.querySelector('.section__results')
  });

  // recursively remove all child nodes of a DOM element
  const removeKids = (element) => {
    if (element.hasChildNodes()) {
      element.removeChild(element.firstChild);

      return DOM.removeKids(element);
    }
  };

  // create stats & articles/suggestions templates & append to fragment
  const prepResultFragment = (data) => {
    const {hits, queryText, articles, suggest} = data;

    const fragment = _doc.createDocumentFragment();
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

    return fragment;
  };

  // clear results, hide 'newSearchBtn' & put focus on input field
  const newSearch = () => {
    const {resultSection, newSearchBtn, input} = els;
    removeKids(resultSection);
    newSearchBtn.hidden = true;
    input.value = '';
    input.focus();
  };

  // display an alert message to DOM & remove after x milliseconds
  const alertCtrl = (msg='Aww shucks! Something went wrong') => {
    if (!_doc.querySelector('.alert-div')) {
      const removeDelay = 2700;
      const alert = _templates.alert(msg);
      print(els.alertSection, alert);
      _delayedRemoveEl('.alert-div', removeDelay);
    }
  };

  // append an element to the DOM
  const print = (target, element) => target.appendChild(element);

  return Object.freeze({
    els,
    removeKids,
    prepResultFragment,
    newSearch,
    alertCtrl,
    print
  });
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


/* INITIALIZE PROGRAM - main control & event listeners */
const init = ((DOM, DATA, validateInput) => {
  const {
    els,
    prepResultFragment,
    removeKids,
    newSearch,
    alertCtrl,
    print
  } = DOM;
  const {makeRequest, filterResponse} = DATA;
  const {input, newSearchBtn, resultSection} = els;

  // main controller function
  const ctrl = async (input) => {
    const queryText = validateInput(input);
    if (!queryText) return alertCtrl('Please enter a search query');
    try {
      const rawResponse = await makeRequest(queryText);
      const data = filterResponse(rawResponse.query);
      if (data.hits < 1) alertCtrl(`No results for "${queryText}"`);
      const resultFragment = prepResultFragment({...data, queryText});
      if (resultSection.hasChildNodes()) removeKids(els.resultSection);
      newSearchBtn.hidden = false;
      
      return print(resultSection, resultFragment);
    } catch (error) {
      alertCtrl();
    }
  };

  // event-listeners
  input.addEventListener('keyup', (e) => ctrl(e.target.value));
  newSearchBtn.addEventListener('click', () => newSearch());
  resultSection.addEventListener('click', (e) => {
    if (e.target.className.includes('query')) {
      const currentInput = input.value.trim();
      const newInput = e.target.className.includes('art') 
        ? e.target.parentElement.parentElement.firstChild.textContent
        : e.target.textContent;
      // only make new search if 'text' !== current 'input.value'
      if (currentInput === newInput) return null;
      input.value = newInput;
      ctrl(newInput);
    }
  });
})(DOM, DATA, UTILS.validateInput);
