Components.utils.import("resource://gre/modules/Services.jsm");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.button = {

  recentlyBlocked: new Array(),

  clearRecentList: function() {
    httpNowhere.button.recentlyBlocked = new Array();
    httpNowhere.button.updateView();
  },

  init: function() {
    // Add the button, update the view, and show the installed message, if needed
    setTimeout(function() {
      if (!Services.prefs.getBoolPref("extensions.http_nowhere.ranonce")) {
        // put the button on the toolbar if not already there
        var navbar = document.getElementById("nav-bar");
        var curSet = navbar.currentSet;
        if (curSet.indexOf("http-nowhere-button") == -1) {
           // put it just before the urlbar if present
           var set = curSet.replace(/urlbar-container/, "http-nowhere-button,urlbar-container");
           if (set.indexOf("http-nowhere-button") == -1) {
             // otherwise, put it on the far right
             set = curSet + ',http-nowhere-button';
           }
           navbar.setAttribute('currentset', set);
           navbar.currentSet = set;
           document.persist('nav-bar', 'currentset');
        }
        // give a quick one-time usage message
        Services.prompt.alert(null, "HTTP Nowhere is now installed", "Click the lock button in the toolbar to enable or disable it.\n\nWhile enabled, unencrypted web requests will fail.");
        Services.prefs.setBoolPref("extensions.http_nowhere.ranonce", true);
      }
      httpNowhere.button.updateView();
    }, 500);

    // Observe interesting stuff
    Services.obs.addObserver(httpNowhere.button, "http-on-modify-request", false);
  },

  observe: function(subject, topic, data) {
    if (topic == "http-on-modify-request" && httpNowhere.button.isOn()) {
      var request = subject.QueryInterface(Ci.nsIHttpChannel);
      if (request.URI.scheme == "http" && request.URI.host != 'localhost') {
        var button = document.getElementById("http-nowhere-button");
        if (button != null) {
          var notifyImage = "chrome://http-nowhere/skin/button-notify.png";
          if (button.image != notifyImage) {
            button.image = notifyImage;
            setTimeout(function() {
              httpNowhere.button.updateView();
            }, 500);
          }
        }
        request.cancel(Components.results.NS_ERROR_ABORT);
        httpNowhere.button.notifyBlocked(request.URI.spec);
      }
    }
  },

  notifyBlocked: function(url) {
    httpNowhere.button.recentlyBlocked.push(url);
    if (httpNowhere.button.recentlyBlocked.length > 20) {
      httpNowhere.button.recentlyBlocked.pop();
    }
    var notifyImage = "chrome://http-nowhere/skin/button-notify.png";
    if (button.image != notifyImage) {
      httpNowhere.button.updateView();
    }
  },

  isOn: function() {
    return Services.prefs.getBoolPref("extensions.http_nowhere.enabled");
  },

  updateView: function() {
    var button = document.getElementById("http-nowhere-button");
    if (button != null) {
      var toggle = document.getElementById("http-nowhere-toggle");
      var onImage = "chrome://http-nowhere/skin/button-on.png";
      var offImage = "chrome://http-nowhere/skin/button-off.png";
      if (httpNowhere.button.isOn()) {
        button.image = onImage;
        button.tooltipText = "HTTP Nowhere (Enabled)";
        toggle.image = offImage;
        toggle.label = "Disable HTTP Nowhere";
      } else {
        button.image = offImage;
        button.tooltipText = "HTTP Nowhere (Disabled)";
        toggle.image = onImage;
        toggle.label = "Enable HTTP Nowhere";
      }
      var recentlyBlocked = document.getElementById("http-nowhere-recently-blocked");
      recentlyBlocked.label = "Recently Blocked (" + httpNowhere.button.recentlyBlocked.length + ")";
      var recentlyBlockedPopup = document.getElementById("http-nowhere-recently-blocked-popup");
      while (recentlyBlockedPopup.firstChild.tagName != "menuseparator") {
        recentlyBlockedPopup.removeChild(recentlyBlockedPopup.firstChild);
      }
      for (var i = 0; i < httpNowhere.button.recentlyBlocked.length; i++) {
        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute('label', httpNowhere.button.recentlyBlocked[i]);
        recentlyBlockedPopup.insertBefore(menuitem, recentlyBlockedPopup.firstChild);
      }
    }
  },

  toggleState: function() {
    if (httpNowhere.button.isOn()) {
      Services.prefs.setBoolPref("extensions.http_nowhere.enabled", false);
    } else {
      Services.prefs.setBoolPref("extensions.http_nowhere.enabled", true);
    }
    httpNowhere.button.updateView();
  },
}

window.addEventListener("load", httpNowhere.button.init, false);
