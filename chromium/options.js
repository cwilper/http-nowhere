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

function initIntegerControl(id, minValue, maxValue, getter, setter) {
  var element = document.getElementById(id);
  element.value = getter();
  element.addEventListener('change', function() {
    if (!((element.value+"").match(/^\d+$/))) {
      element.value = getter();
      return;
    } else if (element.value < minValue) {
      element.value = minValue;
    } else if (element.value > maxValue) {
      element.value = maxValue;
    }
    setter(element.value);
  });
}

function initBooleanControl(id, getter, setter) {
  var element = document.getElementById(id);
  element.checked = getter();
  element.addEventListener('change', function() {
    setter(element.checked);
  });
}

function generalPageLoaded() {
  debug('generalPageLoaded()');

  // set values from prefs and attach event listeners to handle changes
  initIntegerControl('maxRecentlyBlockedHosts', 0, 99,
      httpNowhere.prefs.getMaxRecentlyBlockedHosts,
      httpNowhere.prefs.setMaxRecentlyBlockedHosts);
  initIntegerControl('maxRecentlyBlockedURLsPerHost', 1, 99,
      httpNowhere.prefs.getMaxRecentlyBlockedURLsPerHost,
      httpNowhere.prefs.setMaxRecentlyBlockedURLsPerHost);
  initBooleanControl('flashButtonOnBlock',
      httpNowhere.prefs.getFlashButtonOnBlock,
      httpNowhere.prefs.setFlashButtonOnBlock);
  initBooleanControl('showBlockCountOnButton',
      httpNowhere.prefs.getShowBlockCountOnButton,
      httpNowhere.prefs.setShowBlockCountOnButton);
  initBooleanControl('autoRedirect',
      httpNowhere.prefs.getAutoRedirect,
      httpNowhere.prefs.setAutoRedirect);
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
