EXPORTED_SYMBOLS = ["httpNowhere"];

Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
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

    // load existing rules
    httpNowhere.rules.load();

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
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(value);
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

    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Allow all from this host", hostname, "httpNowhere.prefs.addAllow(document, window, this);", allowImage);
    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Ignore all from this host", hostname, "httpNowhere.prefs.addIgnore(document, window, this);", ignoreImage);
    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Copy this host", hostname, "httpNowhere.copyValueOf(this);", copyImage);

    hostMenuPopup.appendChild(win.document.createElement("menuseparator"));

    var hostInfo = httpNowhere.recent.hostInfo[hostname];
    var orderedUrls = httpNowhere.recent.getKeysOrderedByLastBlockedDate(hostInfo.urlInfo);
    for (var i = 0; i < orderedUrls.length; i++) {
      var url = orderedUrls[i];
      var urlInfo = hostInfo.urlInfo[url];
      var urlMenu = win.document.createElement("menu");
      urlMenu.setAttribute('label', url + ' (' + urlInfo.blockCount + ')');

      var urlMenuPopup = win.document.createElement("menupopup");
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Allow this URL", url, "httpNowhere.prefs.addAllow(document, window, this);", allowImage);
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Ignore this URL", url, "httpNowhere.prefs.addIgnore(document, window, this);", ignoreImage);
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Copy this URL", url, "httpNowhere.copyValueOf(this);", copyImage);
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

  patternSelected: function(document, window) {
    document.getElementById('httpNowhere-prefs-editButton').setAttribute('disabled', 'false');
    document.getElementById('httpNowhere-prefs-deleteButton').setAttribute('disabled', 'false');
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

  _promptForPattern: function(document, window, title, suggest) {
    var userpattern;
    if (!suggest) {
      suggest = "";
    }
    var input = { value: suggest };
    var text = 'Format is host/path or host:port/path\n\n(* anywhere matches any value)';
    var ok = Services.prompt.prompt(window, title, text, input, null, {value: false});
    if (!ok) {
      return null;
    }
    userpattern = input.value.trim();
    var pattern = userpattern;
    if (pattern.length == 0 || pattern === 'host:port/path') {
      return httpNowhere.prefs._promptForPattern(document, window, title, suggest);
    }
    if (!pattern.startsWith("http://")) {
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
      window.alert("Too many colons in host:port");
      return httpNowhere.prefs._promptForPattern(document, window, title, userpattern);
    }
    var host = hostPort[0].trim();
    if (host.length == 0) {
      window.alert("No host specified");
      return httpNowhere.prefs._promptForPattern(document, window, title, userpattern);
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

  addAllow: function(document, window, menuitem) {
    var suggest = menuitem.value;
    Services.console.logStringMessage("addAllow suggest=" + suggest);
    if (suggest.indexOf("http://") != 0) {
      suggest = suggest + ":*/*";
    } else {
      suggest = suggest.substr(7);
    }
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Add Allowed URL(s)',
        suggest);
    if (pattern != null) {
      httpNowhere.rules.allowedPatterns.push(pattern);
      httpNowhere.rules.save();
      httpNowhere.recent.refresh();
      httpNowhere.button.updateAppearance();
    }
  },

  addIgnore: function(document, window, menuitem) {
    var suggest = menuitem.value;
    Services.console.logStringMessage("addIgnore suggest=" + suggest);
    if (suggest.indexOf("http://") != 0) {
      suggest = suggest + ":*/*";
    } else {
      suggest = suggest.substr(7);
    }
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Add Ignored URL(s)',
        suggest);
    if (pattern != null) {
      httpNowhere.rules.ignoredPatterns.push(pattern);
      httpNowhere.rules.save();
      httpNowhere.recent.refresh();
      httpNowhere.button.updateAppearance();
    }
  },

  addAllowed: function(document, window) {
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Add Allowed URL(s)',
        'host:port/path');
    if (pattern != null) {
      httpNowhere.rules.allowedPatterns.push(pattern);
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-allowed-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-allowed-listbox'),
          httpNowhere.rules.allowedPatterns);
    }
  },

  editAllowed: function(document, window) {
    var oldPattern = document.getElementById('httpNowhere-prefs-allowed-listbox').selectedItem.value;
    var j = oldPattern.indexOf('/');
    var afterScheme = oldPattern.substr(j + 2);
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Edit Allowed URL(s)',
        afterScheme);
    if (pattern != null) {
      for (var i = 0; i < httpNowhere.rules.allowedPatterns.length; i++) {
        var value = httpNowhere.rules.allowedPatterns[i];
        if (value === oldPattern) {
          httpNowhere.rules.allowedPatterns[i] = pattern;
        }
      }
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-allowed-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-allowed-listbox'),
          httpNowhere.rules.allowedPatterns);
    }
  },

  deleteAllowed: function(document, window) {
    var oldPattern = document.getElementById('httpNowhere-prefs-allowed-listbox').selectedItem.value;
    if (Services.prompt.confirm(window, "Delete Allowed URL?", oldPattern + "\n\nThis URL will no longer be allowed.")) {
      var newArray = new Array();
      for (var i = 0; i < httpNowhere.rules.allowedPatterns.length; i++) {
        var value = httpNowhere.rules.allowedPatterns[i];
        if (value != oldPattern) {
          newArray.push(value);
        }
      }
      httpNowhere.rules.allowedPatterns = newArray;
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-allowed-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-allowed-listbox'),
          httpNowhere.rules.allowedPatterns);
    }
  },

  addIgnored: function(document, window) {
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Add Ignored URL',
        'host:port/path');
    if (pattern != null) {
      httpNowhere.rules.ignoredPatterns.push(pattern);
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-ignored-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-ignored-listbox'),
          httpNowhere.rules.ignoredPatterns);
    }
  },

  editIgnored: function(document, window) {
    var oldPattern = document.getElementById('httpNowhere-prefs-ignored-listbox').selectedItem.value;
    var j = oldPattern.indexOf('/');
    var afterScheme = oldPattern.substr(j + 2);
    var pattern = httpNowhere.prefs._promptForPattern(
        document,
        window,
        'Edit Ignored URL',
        afterScheme);
    if (pattern != null) {
      for (var i = 0; i < httpNowhere.rules.ignoredPatterns.length; i++) {
        var value = httpNowhere.rules.ignoredPatterns[i];
        if (value === oldPattern) {
          httpNowhere.rules.ignoredPatterns[i] = pattern;
        }
      }
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-ignored-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-ignored-listbox'),
          httpNowhere.rules.ignoredPatterns);
    }
  },

  deleteIgnored: function(document, window) {
    var oldPattern = document.getElementById('httpNowhere-prefs-ignored-listbox').selectedItem.value;
    if (Services.prompt.confirm(window, "Delete Ignored URL?", oldPattern + "\n\nThis URL will no longer be ignored.")) {
      var newArray = new Array();
      for (var i = 0; i < httpNowhere.rules.ignoredPatterns.length; i++) {
        var value = httpNowhere.rules.ignoredPatterns[i];
        if (value != oldPattern) {
          newArray.push(value);
        }
      }
      httpNowhere.rules.ignoredPatterns = newArray;
      httpNowhere.rules.save();
      document.getElementById('httpNowhere-prefs-ignored-listbox').selectedIndex = -1;
      httpNowhere.prefs._refreshList(
          document,
          document.getElementById('httpNowhere-prefs-ignored-listbox'),
          httpNowhere.rules.ignoredPatterns);
    }
  },

  _refreshList: function(document, listbox, patterns) {
    document.getElementById('httpNowhere-prefs-editButton').setAttribute('disabled', 'true');
    document.getElementById('httpNowhere-prefs-deleteButton').setAttribute('disabled', 'true');
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
      listitem.setAttribute('value', patterns[i]);
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
    // remove all urls that match any allowed or ignored urls
    for (var hostname in httpNowhere.recent.hostInfo) {
      var hostInfo = httpNowhere.recent.hostInfo[hostname];
      for (var url in hostInfo.urlInfo) {
        Services.console.logStringMessage("Checking if " + url + " needs to be removed");
        // remove this urlInfo from this hostInfo if it's no longer blocked
        var uri = Services.io.newURI(url, null, null);
        if (httpNowhere.rules.isAllowed(uri) || httpNowhere.rules.isIgnored(uri)) {
          var oldUrlInfo = hostInfo.urlInfo[url];
          delete hostInfo.urlInfo[url];
          hostInfo.blockCount -= oldUrlInfo.blockCount;
          Services.console.logStringMessage("Removed " + url);
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

  filename: "httpNowhere-rules.json",

  allowedPatterns: [],

  ignoredPatterns: [],

  load: function() {
    var file = FileUtils.getFile("ProfD", [httpNowhere.rules.filename]);
    if (file.exists()) {
      NetUtil.asyncFetch(file, function(inputStream, status) {
        if (!Components.isSuccessCode(status)) {
          Services.console.logStringMessage("ERROR: Unable to load " + httpNowhere.rules.filename + " (status code " + status + ")");
        } else {
          var json = NetUtil.readInputStreamToString(inputStream, inputStream.available());
          var rules = JSON.parse(json);
          httpNowhere.rules.allowedPatterns = rules.allowedPatterns;
          httpNowhere.rules.ignoredPatterns = rules.ignoredPatterns;
        }
      });
    }
  },

  save: function() {
    var json = JSON.stringify({
      allowedPatterns: httpNowhere.rules.allowedPatterns,
      ignoredPatterns: httpNowhere.rules.ignoredPatterns
    });

    var file = FileUtils.getFile("ProfD", [httpNowhere.rules.filename]);
    var ostream = FileUtils.openSafeFileOutputStream(file);
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
        createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var istream = converter.convertToInputStream(json);

    NetUtil.asyncCopy(istream, ostream, function(status) {
      if (!Components.isSuccessCode(status)) {
        Services.console.logStringMessage("ERROR: Unable to save " + httpNowhere.rules.filename + " (status code " + status + ")");
      }
    });
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
    return new RegExp(re);
  }
};
