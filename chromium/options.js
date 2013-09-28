var httpNowhere = chrome.extension.getBackgroundPage().httpNowhere;

document.addEventListener('DOMContentLoaded', dialogOpened);
window.addEventListener('unload', dialogClosed, false);

function dialogOpened() {
  debug('dialogOpened()');
  // attach event listeners
  var menuitems = document.getElementsByClassName('menuitem');
  for (var i = 0; i < menuitems.length; i++) {
    menuitems[i].addEventListener('click', function(e) { pageSelected(e.target); });
  }
  var closeButtons = document.getElementsByClassName('closeButton');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function() { window.close(); });
  }

  // make initial selection
  pageSelected(document.getElementById('general'));
}

function pageSelected(e) {
  debug('pageSelected()');
  // select the menuitem
  var menuitems = document.getElementsByClassName('menuitem');
  for (var i = 0; i < menuitems.length; i++) {
    menuitems[i].setAttribute('class', 'menuitem');
  }
  e.className = 'menuitem menuitem-selected';

  // activate the associated pane
  var panes = document.getElementsByClassName('options-pane');
  for (var i = 0; i < panes.length; i++) {
    panes[i].setAttribute('class', 'options-pane');
  }
  if (e.id === 'general') {
    generalPageLoaded();
  } else if (e.id === 'allowed') {
    allowedPageLoaded();
  } else if (e.id === 'ignored') {
    ignoredPageLoaded();
  }
  document.getElementById(e.id + 'Pane').className = 'options-pane options-pane-active';
}

function dialogClosed() {
  debug('dialogClosed()');
  window.close();
}

function generalPageLoaded() {
  debug('generalPageLoaded()');
}

function allowedPageLoaded() {
  debug('allowedPageLoaded()');
}

function ignoredPageLoaded() {
  debug('ignoredPageLoaded()');
}

function debug(message) {
  chrome.extension.getBackgroundPage().debug('options.js: ' + message);
}
