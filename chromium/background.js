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

// https://chrome.google.com/webstore/detail/storage-area-explorer/ocfjjjjhkpapocigimmppepjgfdecjkb
httpNowhere.prefs = {
  _firstRun: true,
  _enabled: true,
  _flashButtonOnBlock: true,
  _showBlockCountOnButton: true,
  _maxRecentlyBlockedHosts: 20,
  _maxRecentlyBlockedURLsPerHost: 20,
  _autoRedirect: false,

  // load prefs from storage, setting to default values if needed
  load: function(callback) {
    chrome.storage.local.get('prefs', function(items) {
      var prefs = items.prefs;
      if (prefs == null) {
        prefs = {};
      }
      // set default values if needed
      if (prefs.firstRun == null) prefs.firstRun = httpNowhere.prefs._firstRun;
      if (prefs.enabled == null) prefs.enabled = httpNowhere.prefs._enabled;
      if (prefs.flashButtonOnBlock == null) prefs.flashButtonOnBlock = httpNowhere.prefs._flashButtonOnBlock;
      if (prefs.showBlockCountOnButton == null) prefs.showBlockCountOnButton = httpNowhere.prefs._showBlockCountOnButton;
      if (prefs.maxRecentlyBlockedHosts == null) prefs.maxRecentlyBlockedHosts = httpNowhere.prefs._maxRecentlyBlockedHosts;
      if (prefs.maxRecentlyBlockedURLsPerHost == null) prefs.maxRecentlyBlockedURLsPerHost = httpNowhere.prefs._maxRecentlyBlockedURLsPerHost;
      if (prefs.autoRedirect == null) prefs.autoRedirect = httpNowhere.prefs._autoRedirect;

      // set instance values
      httpNowhere.prefs._firstRun = prefs.firstRun;
      httpNowhere.prefs._enabled = prefs.enabled;
      httpNowhere.prefs._flashButtonOnBlock = prefs.flashButtonOnBlock;
      httpNowhere.prefs._showBlockCountOnButton = prefs.showBlockCountOnButton;
      httpNowhere.prefs._maxRecentlyBlockedHosts = prefs.maxRecentlyBlockedHosts;
      httpNowhere.prefs._maxRecentlyBlockedURLsPerHost = prefs.maxRecentlyBlockedURLsPerHost;
      httpNowhere.prefs._autoRedirect = prefs.autoRedirect;

      // ensure all settings are persisted
      httpNowhere.prefs.save();

      callback();
    });
  },

  save: function() {
    var prefs = {
      firstRun: httpNowhere.prefs._firstRun,
      enabled: httpNowhere.prefs._enabled,
      flashButtonOnBlock: httpNowhere.prefs._flashButtonOnBlock,
      showBlockCountOnButton: httpNowhere.prefs._showBlockCountOnButton,
      maxRecentlyBlockedHosts: httpNowhere.prefs._maxRecentlyBlockedHosts,
      maxRecentlyBlockedURLsPerHost: httpNowhere.prefs._maxRecentlyBlockedURLsPerHost,
      autoRedirect: httpNowhere.prefs._autoRedirect
    };
    chrome.storage.local.set({prefs: prefs});
  },

  isEnabled: function() {
    return httpNowhere.prefs._enabled;
  },

  setEnabled: function(value) {
    debug('httpNowhere.prefs.setEnabled(' + value + ')');
    httpNowhere.prefs._enabled = value;
    httpNowhere.prefs.save();
  },

  isFirstRun: function() {
    return httpNowhere.prefs._firstRun;
  },

  setFirstRun: function(value) {
    debug('httpNowhere.prefs.setFirstRun(' + value + ')');
    httpNowhere.prefs._firstRun = value;
    httpNowhere.prefs.save();
  },

  getFlashButtonOnBlock: function() {
    return httpNowhere.prefs._flashButtonOnBlock;
  },

  setFlashButtonOnBlock: function(value) {
    debug('httpNowhere.prefs.setFlashButtonOnBlock(' + value + ')');
    httpNowhere.prefs._flashButtonOnBlock = value;
    httpNowhere.prefs.save();
  },

  getShowBlockCountOnButton: function() {
    return httpNowhere.prefs._showBlockCountOnButton;
  },

  setShowBlockCountOnButton: function(value) {
    debug('httpNowhere.prefs.setShowBlockCountOnButton(' + value + ')');
    httpNowhere.prefs._showBlockCountOnButton = value;
    httpNowhere.prefs.save();
  },

  getMaxRecentlyBlockedHosts: function() {
    return httpNowhere.prefs._maxRecentlyBlockedHosts;
  },

  setMaxRecentlyBlockedHosts: function(value) {
    debug('httpNowhere.prefs.setMaxRecentlyBlockedHosts(' + value + ')');
    httpNowhere.prefs._maxRecentlyBlockedHosts = value;
    httpNowhere.prefs.save();
  },

  getMaxRecentlyBlockedURLsPerHost: function() {
    return httpNowhere.prefs._maxRecentlyBlockedURLsPerHost;
  },

  setMaxRecentlyBlockedURLsPerHost: function(value) {
    debug('httpNowhere.prefs.setMaxRecentlyBlockedURLsPerHost(' + value + ')');
    httpNowhere.prefs._maxRecentlyBlockedURLsPerHost = value;
    httpNowhere.prefs.save();
  },

  getAutoRedirect: function() {
    return httpNowhere.prefs._autoRedirect;
  },

  setAutoRedirect: function(value) {
    debug('httpNowhere.prefs.setAutoRedirect(' + value + ')');
    httpNowhere.prefs._autoRedirect = value;
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
