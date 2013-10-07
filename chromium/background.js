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
      if (!httpNowhere.rules.isAllowed(details.url)) {
        if (httpNowhere.rules.isIgnored(details.url)) {
          debug('Blocked (ignored): ' + details.url);
          return { cancel: true };
        }
        var redirectUri = httpNowhere.rules.getRedirectUri(details.url);
        if (redirectUri != null) {
          return { redirectUrl: redirectUri };
        }
        // signal that a block has occurred by briefly changing the button
        if (!httpNowhere.button.blocking) {
          if (httpNowhere.prefs.getFlashButtonOnBlock()) {
            httpNowhere.button.blocking = true;
            chrome.browserAction.setIcon({path: 'images/icon19-blocking.png'});
            setTimeout(function() {
              httpNowhere.button.blocking = false;
              httpNowhere.button.updateAppearance();
            }, 500);
          } else {
            setTimeout(httpNowhere.button.updateAppearance, 0);
          }
        }
        // update the recent list
        httpNowhere.recent.addURI(httpNowhere.parseUri(details.url));
        debug('Blocked (not ignored): ' + details.url);
        return { cancel: true };
      }
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

    var normalizedPattern = httpNowhere.normalizeUri(pattern);
    if (normalizedPattern == null) {
      return httpNowhere.promptForPattern(title, userpattern);
    }
    return normalizedPattern;
  },

  parseUri: function(uri) {
    var j = uri.indexOf('/');
    var afterScheme = uri.substr(j + 2);
    j = afterScheme.indexOf('/');
    if (j < 0) {
      afterScheme = afterScheme + '/';
      j = afterScheme.indexOf('/');
    }
    // http:///
    var hostPort = afterScheme.substr(0, j).split(':');
    if (hostPort.length > 2) {
      return null;
    }
    var host = hostPort[0].trim();
    if (host.length == 0) {
      return null;
    }
    var port = '80';
    if (hostPort.length == 2) {
      port = hostPort[1].trim();
      if (port.length == 0) {
        port = '80';
      }
    }
    var path = afterScheme.substr(j);

    var spec = 'http://' + host;
    if (port != '80') {
      spec += ':' + port;
    }
    spec += path;

    return { host: host, port: port, path: path, spec: spec };
  },

  // get a version of the given http uri with a port specified, or null
  normalizeUri: function(uri) {
    var u = httpNowhere.parseUri(uri);
    if (u == null) return null;
    return 'http://' + u.host + ":" + u.port + u.path;
  },

  capitalize: function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

httpNowhere.button = {
  blocking: false,

  updateAppearance: function() {
    debug('httpNowhere.button.updateAppearance()');
    if (httpNowhere.prefs.isEnabled()) {
      chrome.browserAction.setIcon({path: 'images/icon19-on.png'});
      chrome.browserAction.setTitle({title: 'HTTP Nowhere (Active)'});
      if (httpNowhere.recent.blockCount > 0 && httpNowhere.prefs.getShowBlockCountOnButton()) {
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

  hostInfo: {},

  blockCount: 0,

  clear: function() {
    httpNowhere.recent.hostInfo = {};
    httpNowhere.recent.blockCount = 0;
  },

  addURI: function(uri) {
    var now = new Date().getTime();

    // update hostInfo as appropriate
    var hostInfo = httpNowhere.recent.hostInfo[uri.host];
    if (hostInfo == null) {
      // add new host to the recent hostInfo list
      hostInfo = {
        blockCount: 0,
        urlInfo: {}
      };
      httpNowhere.recent.hostInfo[uri.host] = hostInfo;
    }
    hostInfo.blockCount += 1;
    hostInfo.lastBlockedDate = now;
    httpNowhere.recent.dropOldHostInfo();

    // update hostInfo.urlInfo as appropriate
    var urlInfo = hostInfo.urlInfo[uri.spec];
    if (urlInfo == null) {
      urlInfo = {
        blockCount: 0
      };
      hostInfo.urlInfo[uri.spec] = urlInfo;
    }
    urlInfo.blockCount += 1;
    urlInfo.lastBlockedDate = now;
    httpNowhere.recent.dropOldUrlInfo(hostInfo);

    httpNowhere.recent.recalculateBlockCount();
  },

  dropOldHostInfo: function() {
    while (Object.keys(httpNowhere.recent.hostInfo).length > httpNowhere.prefs.getMaxRecentlyBlockedHosts()) {
      // delete the hostInfo with the oldest blocked date
      var orderedHostnames = httpNowhere.recent.getKeysOrderedByLastBlockedDate(httpNowhere.recent.hostInfo);
      delete httpNowhere.recent.hostInfo[orderedHostnames[orderedHostnames.length - 1]];
    }
  },

  dropOldUrlInfo: function(hostInfo) {
    while (Object.keys(hostInfo.urlInfo).length > httpNowhere.prefs.getMaxRecentlyBlockedURLsPerHost()) {
      // delete the urlInfo with the oldest blocked date
      var orderedUrls = httpNowhere.recent.getKeysOrderedByLastBlockedDate(hostInfo.urlInfo);
      var oldUrlInfo = hostInfo.urlInfo[orderedUrls[orderedUrls.length - 1]];
      delete hostInfo.urlInfo[orderedUrls[orderedUrls.length - 1]];
      // recalculate the block count for this hostInfo
      hostInfo.blockCount -= oldUrlInfo.blockCount;
    }
  },

  recalculateBlockCount: function() {
    var blockCount = 0;
    for (var hostname in httpNowhere.recent.hostInfo) {
      blockCount += httpNowhere.recent.hostInfo[hostname].blockCount;
    }
    httpNowhere.recent.blockCount = blockCount;
  },

  refresh: function() {
    // remove all urls that match any allowed or ignored urls
    for (var hostname in httpNowhere.recent.hostInfo) {
      var hostInfo = httpNowhere.recent.hostInfo[hostname];
      for (var url in hostInfo.urlInfo) {
        // remove this urlInfo from this hostInfo if it's no longer blocked
        var uri = Services.io.newURI(url, null, null);
        if (httpNowhere.rules.isAllowed(uri) || httpNowhere.rules.isIgnored(uri)) {
          var oldUrlInfo = hostInfo.urlInfo[url];
          delete hostInfo.urlInfo[url];
          hostInfo.blockCount -= oldUrlInfo.blockCount;
        }
      }
      if (Object.keys(hostInfo.urlInfo).length == 0) {
        // remove hostInfo if no more urlInfo for it
        delete httpNowhere.recent.hostInfo[hostname];
      }
      httpNowhere.recent.recalculateBlockCount();
    }

    // remove oldest urlinfo and hostinfo if needed to fit within maximums
    httpNowhere.recent.dropOldHostInfo();
    for (var hostname in httpNowhere.recent.hostInfo) {
      httpNowhere.recent.dropOldUrlInfo(httpNowhere.recent.hostInfo[hostname]);
    }
    httpNowhere.recent.recalculateBlockCount();
  },

  getKeysOrderedByLastBlockedDate: function(info) {
    return Object.keys(info).sort(function(a, b) {
      return info[b].lastBlockedDate - info[a].lastBlockedDate;
    });
  }
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
  },

  isAllowed: function(uri) {
    return uri.indexOf('https://') == 0 || httpNowhere.rules._matchesAny(uri, httpNowhere.rules.allowedPatterns);
  },

  isIgnored: function(uri) {
    return httpNowhere.rules._matchesAny(uri, httpNowhere.rules.ignoredPatterns);
  },

  getRedirectUri: function(uri) {
    if (uri.indexOf('http://') != 0) return null;

    // TODO: complete
    if (httpNowhere.prefs.getAutoRedirect()) {
      return 'https' + uri.substring(4);
    }
    return null;
  },

  _matchesAny: function(uri, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (httpNowhere.rules._matches(uri, patterns[i])) {
        return true;
      }
    }
    return false;
  },

  _matches: function(uri, pattern) {
    var regExp;
    if (pattern.indexOf('~') == 0) {
      regExp = new RegExp(pattern);
    } else {
      regExp = httpNowhere.rules._patternToRegExp(pattern);
    }

    return regExp.test(httpNowhere.normalizeUri(uri));
  },

  _patternToRegExp: function(pattern) {
    var re = '^' + pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*+/g, '.*') + '$';
    return new RegExp(re);
  }
};

httpNowhere.init();

function debug(message) {
  console.log('DEBUG: ' + message);
}
