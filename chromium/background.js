var httpNowhere = {

  init: function() {
    debug('httpNowhere.init()');
    httpNowhere.prefs.load(function() {
      httpNowhere.rules.load(function() {
        chrome.webRequest.onBeforeRequest.addListener(httpNowhere.observe,
            {urls: ['http://*/*']}, ['blocking']);
        chrome.browserAction.setPopup({'popup':'popup.html'});
        chrome.browserAction.setBadgeBackgroundColor({'color':'#999'});
        httpNowhere.button.updateAppearance();
        if (httpNowhere.prefs.isFirstRun()) {
          alert("Welcome to safer browsing with HTTP Nowhere.\n\nWhile active, all unencrypted web requests will be blocked unless you allow or redirect them.\n\nClick the red lock button to pause or configure.");
          httpNowhere.prefs.setFirstRun(false);
        }
      });
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
  },

  promptForPattern: function(title, suggest) {
    var message = title + '\n\n(* anywhere matches any value)';
    if (!suggest) {
      suggest = 'host:port/path';
    }
    var userpattern = prompt(message, suggest);
    if (userpattern == null) {
      return null;
    }
    userpattern = userpattern.trim();
    var pattern = userpattern;
    if (pattern.length == 0 || pattern === 'host:port/path') {
      return httpNowhere.promptForPattern(title, suggest);
    }
    if (pattern.indexOf("http://") != 0) {
      pattern = "http://" + pattern;
    }
    var j = pattern.indexOf('/');
    var afterScheme = pattern.substr(j + 2);
    j = afterScheme.indexOf('/');
    if (j < 0) {
      afterScheme = afterScheme + '/';
      j = afterScheme.indexOf('/');
    }
    // http:///
    var hostPort = afterScheme.substr(0, j).split(':');
    if (hostPort.length > 2) {
      alert("Too many colons in host:port");
      return httpNowhere.promptForPattern(title, userpattern);
    }
    var host = hostPort[0].trim();
    if (host.length == 0) {
      alert("No host specified");
      return httpNowhere.promptForPattern(title, userpattern);
    }
    var port = '80';
    if (hostPort.length == 2) {
      port = hostPort[1].trim();
      if (port.length == 0) {
        port = '80';
      }
    }
    var path = afterScheme.substr(j);

    return 'http://' + host + ":" + port + path;
  },

  capitalize: function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
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
  load: function(finishedCallback) {
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

      // ensure all prefs are persisted
      httpNowhere.prefs.save();

      finishedCallback();
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
    httpNowhere.prefs._maxRecentlyBlockedHosts = +value;
    httpNowhere.prefs.save();
  },

  getMaxRecentlyBlockedURLsPerHost: function() {
    return httpNowhere.prefs._maxRecentlyBlockedURLsPerHost;
  },

  setMaxRecentlyBlockedURLsPerHost: function(value) {
    debug('httpNowhere.prefs.setMaxRecentlyBlockedURLsPerHost(' + value + ')');
    httpNowhere.prefs._maxRecentlyBlockedURLsPerHost = +value;
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

httpNowhere.rules = {
  _recentRedirectUris: { },
  allowedPatterns: [],
  ignoredPatterns: [],

  getPatterns: function(list) {
    if (list == 'allowed') {
      return httpNowhere.rules.allowedPatterns;
    } else if (list == 'ignored') {
      return httpNowhere.rules.ignoredPatterns;
    }
  },

  load: function(finishedCallback) {
    chrome.storage.local.get('rules', function(items) {
      var rules = items.rules;
      if (rules == null) {
        rules = {};
      }
      // set default values if needed
      if (rules.allowedPatterns == null) rules.allowedPatterns = [];
      if (rules.ignoredPatterns == null) rules.ignoredPatterns = [];

      // set instance values
      httpNowhere.rules.allowedPatterns = rules.allowedPatterns;
      httpNowhere.rules.ignoredPatterns = rules.ignoredPatterns;

      // ensure all rules are persisted
      httpNowhere.rules.save();

      finishedCallback();
    });
  },

  save: function() {
    var rules = {
      allowedPatterns: httpNowhere.rules.allowedPatterns,
      ignoredPatterns: httpNowhere.rules.ignoredPatterns
    };
    chrome.storage.local.set({rules: rules});
  }
};

httpNowhere.init();

function debug(message) {
  console.log('DEBUG: ' + message);
}
