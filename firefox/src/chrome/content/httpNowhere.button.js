EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("chrome://http-nowhere/content/httpNowhere.prefs.js");
Components.utils.import("chrome://http-nowhere/content/httpNowhere.recent.js");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.button = {

  _getWin: function(id) {
    return Services.wm.getMostRecentWindow("navigator:browser");
  },

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
        setTimeout(function() {
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
    var toggleEnabledElement = httpNowhere.button._getWin().document.getElementById("httpNowhere-toggleEnabled");
    if (httpNowhere.prefs.isEnabled()) {
      toggleEnabledElement.image = disabledImage;
      toggleEnabledElement.label = "Disable HTTP Nowhere";
    } else {
      toggleEnabledElement.image = enabledImage;
      toggleEnabledElement.label = "Enable HTTP Nowhere";
    }

    var recentlyBlockedElement = httpNowhere.button._getWin().document.getElementById("httpNowhere-recently-blocked");
    recentlyBlockedElement.label = "Recently Blocked (" + httpNowhere.recent.blockCount + ")";
  },

  updateRecentMenu: function() {
    var win = httpNowhere.button._getWin();

    var recentlyBlockedPopup = win.document.getElementById("httpNowhere-recently-blocked-popup");
    if (recentlyBlockedPopup.state == 'open') return true; // no need to re-populate
    while (recentlyBlockedPopup.firstChild.tagName != "menuseparator") {
      recentlyBlockedPopup.removeChild(recentlyBlockedPopup.firstChild);
    }

    var orderedHostnames = httpNowhere.recent.getKeysOrderedByLastBlockedDate(httpNowhere.recent.hostInfo);
    for (var i = 0; i < orderedHostnames.length; i++) {
      var hostname = orderedHostnames[i];
      var hostInfo = httpNowhere.recent.hostInfo[hostname];
      var hostMenu = win.document.createElement("menu");
      hostMenu.setAttribute('label', 'http://' + hostname + ' (' + hostInfo.blockCount + ')');
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

    var win = httpNowhere.button._getWin();

    while (hostMenuPopup.hasChildNodes()) {
      hostMenuPopup.removeChild(hostMenuPopup.firstChild);
    }

    var hostname = hostMenuPopup.parentNode.getAttribute('hostname');

    var hostInfo = httpNowhere.recent.hostInfo[hostname];
    var orderedUrls = httpNowhere.recent.getKeysOrderedByLastBlockedDate(hostInfo.urlInfo);
    for (var i = 0; i < orderedUrls.length; i++) {
      var url = orderedUrls[i];
      var urlInfo = hostInfo.urlInfo[url];
      var urlMenu = win.document.createElement("menu");
      urlMenu.setAttribute('label', url + ' (' + urlInfo.blockCount + ')');

      var urlMenuPopup = win.document.createElement("menupopup");
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Allow", url);
      httpNowhere.button._appendMenuItem(win, urlMenuPopup, "Quietly Block", url);
      urlMenu.appendChild(urlMenuPopup);

      hostMenuPopup.appendChild(urlMenu);
    }

    hostMenuPopup.appendChild(win.document.createElement("menuseparator"));

    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Allow All", hostname);
    httpNowhere.button._appendMenuItem(win, hostMenuPopup, "Quietly Block All", hostname);

    return true;
  },

  _appendMenuItem: function(win, menupopup, label, value, command) {
    var menuitem = win.document.createElement("menuitem");
    menuitem.setAttribute("label", label);
    menuitem.setAttribute("value", value);
    menupopup.appendChild(menuitem);
    return menuitem;
  },
};
