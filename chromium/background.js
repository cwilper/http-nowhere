var httpNowhere = {

  init: function() {
    debug('httpNowhere.init()');
    httpNowhere.prefs.load(function() {
      chrome.webRequest.onBeforeRequest.addListener(httpNowhere.observe,
          {urls: ['http://*/*']}, ['blocking']);
      chrome.browserAction.setPopup({'popup':'popup.html'});
      chrome.browserAction.setBadgeBackgroundColor({'color':'#999'});
      httpNowhere.button.updateAppearance();
    });
  },

  observe: function(details) {
    if (httpNowhere.prefs.isEnabled()) {
      httpNowhere.recent.blockCount += 1;
      httpNowhere.button.updateAppearance();
      var newUrl = 'https' + details.url.substring(4);
      // return {'redirectUrl': newUrl};
    }
  },

  toggleEnabled: function() {
    debug('httpNowhere.toggleEnabled()');
    httpNowhere.prefs.setEnabled(!httpNowhere.prefs.isEnabled());
    httpNowhere.button.updateAppearance();
  },

  showPage: function(filename) {
    debug('httpNowhere.showPage(' + filename + ')');
    var pageUrl = chrome.extension.getURL(filename);
    chrome.tabs.query({url: pageUrl}, function(tabs) {
      if (tabs.length) {
        chrome.tabs.update(tabs[0].id, {active: true});
      } else {
        chrome.tabs.create({url: pageUrl});
      }
    });
  }
};

httpNowhere.button = {
  updateAppearance: function() {
    debug('httpNowhere.button.updateAppearance()');
    if (httpNowhere.prefs.isEnabled()) {
      chrome.browserAction.setIcon({path: 'images/icon19-on.png'});
      chrome.browserAction.setTitle({title: 'HTTP Nowhere (Active)'});
      if (httpNowhere.recent.blockCount > 0) {
        chrome.browserAction.setBadgeText({text: httpNowhere.recent.blockCount + ''});
      } else {
        chrome.browserAction.setBadgeText({text: ''});
      }
    } else {
      chrome.browserAction.setIcon({path: 'images/icon19-off.png'});
      chrome.browserAction.setTitle({title: 'HTTP Nowhere (Paused)'});
      chrome.browserAction.setBadgeText({text: ''});
    }
  }
};

httpNowhere.prefs = {
  _enabled: true,

  load: function(callback) {
    // get initial prefs (with defaults if necessary) from local storage
    chrome.storage.local.get('prefs', function(items) {
      var prefs = items.prefs;
      if (prefs == null) {
        prefs = {};
      }
      // set default values
      if (prefs.enabled == null) prefs.enabled = true;

      // set instance values
      httpNowhere.prefs._enabled = prefs.enabled;

      // save in case we set some default values
      httpNowhere.prefs.save();

      callback();
    });
  },

  save: function() {
    var prefs = {
      enabled: httpNowhere.prefs._enabled
    };
    chrome.storage.local.set({prefs: prefs});
  },

  isEnabled: function() {
    return httpNowhere.prefs._enabled;
  },

  // https://chrome.google.com/webstore/detail/storage-area-explorer/ocfjjjjhkpapocigimmppepjgfdecjkb
  setEnabled: function(value) {
    debug('httpNowhere.prefs.setEnabled(' + value + ')');
    httpNowhere.prefs._enabled = value;
    httpNowhere.prefs.save();
  }
};

httpNowhere.recent = {
  blockCount: 0
};

httpNowhere.init();

function debug(message) {
  console.log('DEBUG: ' + message);
}
