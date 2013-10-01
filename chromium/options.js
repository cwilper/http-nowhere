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
  var doneButtons = document.getElementsByClassName('doneButton');
  for (var i = 0; i < doneButtons.length; i++) {
    doneButtons[i].addEventListener('click', function() { window.close(); });
  }
  var addButtons = document.getElementsByClassName('addButton');
  for (var i = 0; i < addButtons.length; i++) {
    addButtons[i].addEventListener('click', function(e) {
      clickedAdd(e.target.getAttribute('list'));
    });
  }
  var editButtons = document.getElementsByClassName('editButton');
  for (var i = 0; i < editButtons.length; i++) {
    editButtons[i].addEventListener('click', function(e) {
      clickedEdit(e.target.getAttribute('list'));
    });
  }
  var deleteButtons = document.getElementsByClassName('deleteButton');
  for (var i = 0; i < deleteButtons.length; i++) {
    deleteButtons[i].addEventListener('click', function(e) {
      clickedDelete(e.target.getAttribute('list'));
    });
  }
  var urllists = document.getElementsByClassName('urllist');
  for (var i = 0; i < urllists.length; i++) {
    urllists[i].addEventListener('click', function() {
      if (this.selectedIndex > -1) {
        setButtonDisabled('edit', this.getAttribute('list'), false);
        setButtonDisabled('delete', this.getAttribute('list'), false);
      }
    });
  }

  // make initial selection
  pageSelected(document.getElementById('general'));
}

function setButtonDisabled(type, list, disabled) {
  var buttons = document.getElementsByClassName(type + 'Button');
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute('list') == list) {
      buttons[i].disabled = disabled;
    }
  }
}

function pageSelected(e) {
  debug('pageSelected()');
  // select the menuitem
  var menuitems = document.getElementsByClassName('menuitem');
  for (var i = 0; i < menuitems.length; i++) {
    menuitems[i].setAttribute('class', 'menuitem');
  }
  e.className = 'menuitem menuitem-selected';

  // initialize and show the associated pane
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

function initUrlPatternListControl(list, patterns) {
  // set initial view state from data
  var select = document.getElementById(list + 'List');
  while (select.hasChildNodes()) {
    select.removeChild(select.firstChild);
  }
  patterns.sort(function(a, b){return a < b ? -1 : 1});
  for (var i = 0; i < patterns.length; i++) {
    var option = document.createElement('option');
    option.setAttribute('value', patterns[i]);
    option.appendChild(document.createTextNode(patterns[i]));
    select.appendChild(option);
  }

  // no initial selection so edit and delete buttons are disabled
  setButtonDisabled('edit', list, true);
  setButtonDisabled('delete', list, true);
}

function generalPageLoaded() {
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
  initUrlPatternListControl('allowed', httpNowhere.rules.allowedPatterns);
}

function ignoredPageLoaded() {
  debug('ignoredPageLoaded()');
  initUrlPatternListControl('ignored', httpNowhere.rules.ignoredPatterns);
}

function clickedAdd(list) {
  debug('clickedAdd(' + list + ')');
  var pattern = httpNowhere.promptForPattern('Enter ' + list + ' URL(s)');
  if (pattern != null) {
    var patterns;
    if (list == 'allowed') {
      patterns = httpNowhere.rules.allowedPatterns;
    } else if (list == 'ignored') {
      patterns = httpNowhere.rules.ignoredPatterns;
    }
    if (patterns.indexOf(pattern) == -1) {
      patterns.push(pattern);
      httpNowhere.rules.save();
    }
    initUrlPatternListControl(list, patterns);
  }
}

function clickedEdit(list) {
  debug('clickedEdit(' + list + ')');
}

function clickedDelete(list) {
  debug('clickedDelete(' + list + ')');
}

function debug(message) {
  chrome.extension.getBackgroundPage().debug('options.js: ' + message);
}
