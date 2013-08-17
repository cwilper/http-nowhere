EXPORTED_SYMBOLS = ["httpNowhere"];

Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/Services.jsm");

var httpNowhere = {
  _getWindow: function(id) {
    return Services.wm.getMostRecentWindow("navigator:browser");
  },

  init: function() {
    // add the button and show the installed message, if needed
    if (httpNowhere.prefs.isFirstRun()) {
      // put the button on the toolbar if not already there
      var navbar = httpNowhere._getWindow().document.getElementById("nav-bar");
      var curSet = navbar.currentSet;
        if (curSet.indexOf("httpNowhere-button") == -1) {
         // put it just before the urlbar if present
         var set = curSet.replace(/urlbar-container/, "httpNowhere-button,urlbar-container");
         if (set.indexOf("httpNowhere-button") == -1) {
           // otherwise, put it on the far right
           set = curSet + ',httpNowhere-button';
         }
         navbar.setAttribute('currentset', set);
         navbar.currentSet = set;
         httpNowhere._getWindow().document.persist('nav-bar', 'currentset');
      }
      // give a quick one-time usage message
      Services.prompt.alert(null, "HTTP Nowhere is now installed", "Click the lock button to enable or disable it.\n\nWhile enabled, unencrypted web requests will fail.");
      httpNowhere.prefs.setFirstRun(false);
    }
    httpNowhere.button.updateAppearance();

    // start observing all http requests
    Services.obs.addObserver(httpNowhere, "http-on-modify-request", false);
  },

  observe: function(subject, topic, data) {
    if (topic == "http-on-modify-request" && httpNowhere.prefs.isEnabled()) {
      var request = subject.QueryInterface(Ci.nsIHttpChannel);
      if (!httpNowhere.rules.isAllowed(request.URI)) {
        // abort the request
        request.cancel(Components.results.NS_ERROR_ABORT);
        if (!httpNowhere.rules.isIgnored(request.URI)) {
          // signal that a block has occurred by briefly changing the badge
          var button = httpNowhere._getWindow().document.getElementById("httpNowhere-button");
          if (button != null) {
            if (button.getAttribute('status') != 'blocking') {
              button.setAttribute('status', 'blocking');
              httpNowhere._getWindow().setTimeout(function() {
                httpNowhere.button.updateAppearance();
              }, 500);
            }
          }
          // update the recent list
          httpNowhere.recent.addURI(request.URI);
        }
      }
    }
  },

  toggleEnabled: function() {
    httpNowhere.prefs.setEnabled(!httpNowhere.prefs.isEnabled());
    httpNowhere.button.updateAppearance();
  },

  clearRecent: function() {
    httpNowhere.recent.clear();
    httpNowhere.button.updateAppearance();
  },

  copyValueOf: function(element) {
    var value = element.getAttribute('value');
    Services.prompt.alert(null, "Copied This:", value);
  }
}

httpNowhere.button = {

  updateAppearance: function(blocking) {
    var wins = Services.wm.getEnumerator(null);
    while (wins.hasMoreElements()) {
      var win = wins.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
      httpNowhere.button._updateAppearanceForWin(win, blocking);
    }
  },

  _updateAppearanceForWin: function(win, blocking) {
    var buttonElement = win.document.getElementById("httpNowhere-button");
    if (buttonElement != null) {
      if (blocking && button.getAttribute('status') != 'blocking') {
        button.setAttribute('status', 'blocking');
        httpNowhere._getWindow().setTimeout(function() {
          httpNowhere.button.updateAppearance();
        }, 250);
      } else if (httpNowhere.prefs.isEnabled()) {
        buttonElement.setAttribute('status', 'enabled');
        if (httpNowhere.recent.blockCount == 0) {
          buttonElement.setAttribute('badgeLabel', '');
        } else {
          buttonElement.setAttribute('badgeLabel', httpNowhere.recent.blockCount);
        }
        buttonElement.tooltipText = "HTTP Nowhere (Enabled)";
      } else {
        buttonElement.setAttribute('status', 'disabled');
        buttonElement.setAttribute('badgeLabel', '');
        buttonElement.tooltipText = "HTTP Nowhere (Disabled)";
      }
    }
  },

  updateTopMenu: function() {
    // TODO: get urls from dtd
    var enabledImage = "chrome://http-nowhere/skin/httpNowhere-button-enabled.png";
    var disabledImage = "chrome://http-nowhere/skin/httpNowhere-button-disabled.png";
    var toggleEnabledElement = httpNowhere._getWindow().document.getElementById("httpNowhere-toggleEnabled");
    if (httpNowhere.prefs.isEnabled()) {
      toggleEnabledElement.image = disabledImage;
      toggleEnabledElement.label = "Disable HTTP Nowhere";
    } else {
      toggleEnabledElement.image = enabledImage;
      toggleEnabledElement.label = "Enable HTTP Nowhere";
    }

    var recentlyBlockedElement = httpNowhere._getWindow().document.getElementById("httpNowhere-recently-blocked");
    recentlyBlockedElement.label = "Recently Blocked (" + httpNowhere.recent.blockCount + ")";
  },

  updateRecentMenu: function() {
    var win = httpNowhere._getWindow();

    var recentlyBlockedPopup = win.document.getElementById("httpNowhere-recently-blocked-popup");
    if (recentlyBlockedPopup.state == 'open') return true; // no need to re-populate
    while (recentlyBlockedPopup.firstChild.tagName != "menuseparator") {
      recentlyBlockedPopup.removeChild(recentlyBlockedPopup.firstChild);
    }

    var orderedHostnames = httpNowhere.recent.getKeysOrderedByLastBlockedDate(httpNowhere.recent.hostInfo);
    orderedHostnames.reverse();
    for (var i = 0; i < orderedHostnames.length; i++) {
      var hostname = orderedHostnames[i];
      var hostInfo = httpNowhere.recent.hostInfo[hostname];
      var hostMenu = win.document.createElement("menu");
      hostMenu.setAttribute('label', 'From ' + hostname + ' (' + hostInfo.blockCount + ')');
      hostMenu.setAttribute('hostname', hostname);

      var hostMenuPopup = win.document.createElement("menupopup");
      hostMenuPopup.setAttribute('onpopupshowing', 'httpNowhere.button.updateRecentHostMenu(this);');
      hostMenu.appendChild(hostMenuPopup);

      recentlyBlockedPopup.insertBefore(hostMenu, recentlyBlockedPopup.firstChild);
    }

    return true;
  },

  updateRecentHostMenu: function(hostMenuPopup) {
    if (hostMenuPopup.state == 'open') return true; // no need to re-populate

    var win = httpNowhere._getWindow();

    while (hostMenuPopup.hasChildNodes()) {
      hostMenuPopup.removeChild(hostMenuPopup.firstChild);
    }

    var hostname = hostMenuPopup.parentNode.getAttribute('hostname');

    var allowImage = 'chrome://http-nowhere/skin/httpNowhere-allow.png';
    var ignoreImage = 'chrome://http-nowhere/skin/httpNowhere-ignore.png';
    var copyImage = 'chrome://http-nowhere/skin/httpNowhere-copy.png';

    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Allow All", hostname, null, allowImage);
    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Ignore All", hostname, null, ignoreImage);
    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Copy Host", hostname, "httpNowhere.copyValueOf(this);", copyImage);

    hostMenuPopup.appendChild(win.document.createElement("menuseparator"));

    var hostInfo = httpNowhere.recent.hostInfo[hostname];
    var orderedUrls = httpNowhere.recent.getKeysOrderedByLastBlockedDate(hostInfo.urlInfo);
    for (var i = 0; i < orderedUrls.length; i++) {
      var url = orderedUrls[i];
      var urlInfo = hostInfo.urlInfo[url];
      var urlMenu = win.document.createElement("menu");
      urlMenu.setAttribute('label', url + ' (' + urlInfo.blockCount + ')');

      var urlMenuPopup = win.document.createElement("menupopup");
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Allow", url, null, allowImage);
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Ignore", url, null, ignoreImage);
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Copy URL", url, "httpNowhere.copyValueOf(this);", copyImage);
      urlMenu.appendChild(urlMenuPopup);

      hostMenuPopup.appendChild(urlMenu);
    }

    return true;
  },

  _appendMenuItem: function(win, menupopup, label, value, oncommand, image) {
    var menuitem = win.document.createElement("menuitem");
    menuitem.setAttribute("label", label);
    menuitem.setAttribute("value", value);
    menuitem.setAttribute("oncommand", oncommand);
    if (image != null) {
      menuitem.setAttribute("class", "menuitem-iconic");
      menuitem.setAttribute("image", image);
    }
    menupopup.appendChild(menuitem);
    return menuitem;
  }
};

httpNowhere.prefs = {

  branch: Services.prefs.getBranch("extensions.httpNowhere."),

  isEnabled: function() {
    return httpNowhere.prefs.branch.getBoolPref("enabled");
  },

  setEnabled: function(value) {
    return httpNowhere.prefs.branch.setBoolPref("enabled", value);
  },

  isFirstRun: function() {
    return httpNowhere.prefs.branch.getBoolPref("firstRun");
  },

  setFirstRun: function(value) {
    httpNowhere.prefs.branch.setBoolPref("firstRun", value);
  },

  getMaxRecentlyBlockedHosts: function() {
    return httpNowhere.prefs.branch.getIntPref("maxRecentlyBlockedHosts");
  },

  setMaxRecentlyBlockedHosts: function(value) {
    httpNowhere.prefs.branch.setIntPref("maxRecentlyBlockedHosts", value);
  },

  getMaxRecentlyBlockedURLsPerHost: function() {
    return httpNowhere.prefs.branch.getIntPref("maxRecentlyBlockedURLsPerHost");
  },

  setMaxRecentlyBlockedURLsPerHost: function(value) {
    httpNowhere.prefs.branch.setIntPref("maxRecentlyBlockedURLsPerHost", value);
  },

  pageSelected: function(document, window) {
    var selectedItem = document.getElementById('httpNowhere-prefs-list').selectedItem;

    var iframe = document.getElementById('httpNowhere-prefs-iframe');
    iframe.setAttribute('src', selectedItem.value);

    var dialogheader = document.getElementById('httpNowhere-prefs-dialogheader');
    dialogheader.setAttribute('title', selectedItem.label);
  },

  dialogClosed: function(document, window) {
    httpNowhere.recent.refresh();
    httpNowhere.button.updateAppearance();
    return true;
  },

  generalPageLoaded: function(document, window) {
    document.getElementById('httpNowhere-prefs-maxRecentlyBlockedHosts').value = httpNowhere.prefs.getMaxRecentlyBlockedHosts();
    document.getElementById('httpNowhere-prefs-maxRecentlyBlockedURLsPerHost').value = httpNowhere.prefs.getMaxRecentlyBlockedURLsPerHost();
    return true;
  },

  allowedPageLoaded: function(document, window) {
    httpNowhere.prefs._refreshList(
        document,
        document.getElementById('httpNowhere-prefs-allowed-listbox'),
        httpNowhere.rules.allowedPatterns);
    return true;
  },

  ignoredPageLoaded: function(document, window) {
    httpNowhere.prefs._refreshList(
        document,
        document.getElementById('httpNowhere-prefs-ignored-listbox'),
        httpNowhere.rules.ignoredPatterns);
    return true;
  },

  _refreshList: function(document, listbox, patterns) {
    while (listbox.hasChildNodes()) {
      listbox.removeChild(listbox.firstChild);
    }

    var listhead = document.createElement('listhead');
    var hostHeader = document.createElement('listheader');
    hostHeader.setAttribute('label', 'Host');
    listhead.appendChild(hostHeader);
    var portHeader = document.createElement("listheader");
    portHeader.setAttribute('label', 'Port');
    listhead.appendChild(portHeader);
    var pathHeader = document.createElement("listheader");
    pathHeader.setAttribute('label', 'Path');
    listhead.appendChild(pathHeader);
    listbox.appendChild(listhead);

    var listcols = document.createElement('listcols');
    var listcol = document.createElement('listcol');
    listcols.appendChild(listcol);
    listcol = document.createElement('listcol');
    listcols.appendChild(listcol);
    listcol = document.createElement('listcol');
    listcol.setAttribute('flex', '1');
    listcols.appendChild(listcol);
    listbox.appendChild(listcols);

    patterns.sort(function(a, b){return a < b ? -1 : 1});

    for (var i = 0; i < patterns.length; i++) {
      var j = patterns[i].indexOf('/');
      var afterScheme = patterns[i].substr(j + 2);
      j = afterScheme.indexOf('/');
      var hostPort = afterScheme.substr(0, j).split(':');
      var host = hostPort[0];
      var port = hostPort[1];
      var path = afterScheme.substr(j);

      var listitem = document.createElement('listitem');
      var hostCell = document.createElement('listcell');
      hostCell.setAttribute('label', host + ' ');
      listitem.appendChild(hostCell);
      var portCell = document.createElement('listcell');
      portCell.setAttribute('label',  ' ' + port + ' ');
      listitem.appendChild(portCell);
      var pathCell = document.createElement('listcell');
      pathCell.setAttribute('label', ' ' + path);
      listitem.appendChild(pathCell);
      listbox.appendChild(listitem);
    }
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

  allowedPatterns: ['http://imgur.com:80/*', 'http://*.imgur.com:80/*'],

  ignoredPatterns: ['http://ocsp.*:80/*', 'http://*.adzerk.net:80/*'],

  load: function() {
  },

  save: function() {
  },

  isAllowed: function(uri) {
    return uri.scheme == 'https' || httpNowhere.rules._matchesAny(uri, httpNowhere.rules.allowedPatterns);
  },

  isIgnored: function(uri) {
    return httpNowhere.rules._matchesAny(uri, httpNowhere.rules.ignoredPatterns);
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
    var portNum = uri.port;
    if (portNum == -1) {
      portNum = 80;
    }
    var normalizedUri = uri.scheme + '://' + uri.host + ':' + portNum + uri.path;
    Services.console.logStringMessage(normalizedUri);

    var regExp;
    if (pattern.indexOf('~') == 0) {
      regExp = new RegExp(pattern);
    } else {
      regExp = httpNowhere.rules._patternToRegExp(pattern);
    }

    return regExp.test(normalizedUri);
  },

  _patternToRegExp: function(pattern) {
    var re = '^' + pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*+/g, '.*') + '$';
    Services.console.logStringMessage(pattern + " -> " + re);
    return new RegExp(re);
  }
};
