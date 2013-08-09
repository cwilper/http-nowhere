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
    var buttonElement = httpNowhere.button._getWin().document.getElementById("httpNowhere-button");
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
    recentlyBlockedElement.label = "Recent Blocks (" + httpNowhere.recent.blockCount + ")";
  },

  updateRecentMenu: function() {
    var recentlyBlockedPopupElement = httpNowhere.button._getWin().document.getElementById("httpNowhere-recently-blocked-popup");
    while (recentlyBlockedPopupElement.firstChild.tagName != "menuseparator") {
      recentlyBlockedPopupElement.removeChild(recentlyBlockedPopupElement.firstChild);
    }

    var orderedHostnames = httpNowhere.recent.getKeysOrderedByLastBlockedDate(httpNowhere.recent.hostInfo);
    for (var i = 0; i < orderedHostnames.length; i++) {
      var hostname = orderedHostnames[i];
      var hostInfo = httpNowhere.recent.hostInfo[orderedHostnames[i]];
      var menuitem = httpNowhere.button._getWin().document.createElement("menuitem");
      menuitem.setAttribute('label', hostname + " (" + hostInfo.blockCount + ")");
      recentlyBlockedPopupElement.insertBefore(menuitem, recentlyBlockedPopupElement.firstChild);
    }
  }
};
