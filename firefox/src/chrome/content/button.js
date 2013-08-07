Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("chrome://http-nowhere/content/PrefListener.js");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.button = {

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
        Services.prompt.alert(null, "HTTP-Nowhere is now installed", "Click the lock button in the toolbar to enable or disable it.\n\nWhile enabled, all unencrypted web requests will fail with a proxy error.");
        Services.prefs.setBoolPref("extensions.http_nowhere.ranonce", true);
      }
      httpNowhere.button.updateView();
    }, 1500);

    // Update the view anytime proxy settings change.
    var myListener = new httpNowhere.PrefListener("network.proxy.", function(branch, name) {
      httpNowhere.button.updateView();
    });
    myListener.register(true);

    // Observe interesting stuff
    Services.obs.addObserver(httpNowhere.button, "http-on-modify-request", false);
  },

  observe: function(subject, topic, data) {
    if (topic == "http-on-modify-request") {
      var request = subject.QueryInterface(Ci.nsIHttpChannel);
      if (request.URI.scheme == "http" && request.URI.host != 'localhost') {
        var button = document.getElementById("http-nowhere-button");
        if (button != null) {
          var notifyURL = "chrome://http-nowhere/skin/button-notify.24.png";
          var onURL = "chrome://http-nowhere/skin/button-on.24.png";
          if (button.image != notifyURL) {
            button.image = notifyURL;
            setTimeout(function() {
              button.image = onURL;
            }, 500);
          }
        }
        request.cancel(Components.results.NS_ERROR_ABORT);
        Services.console.logStringMessage("HTTP-Nowhere Blocked " + request.URI.spec);
      }
    }
  },

  isOn: function() {
    return Services.prefs.getIntPref("network.proxy.type") == 1 // manual
        && Services.prefs.getCharPref("network.proxy.http") == "localhost"
        && Services.prefs.getIntPref("network.proxy.http_port") == 4;
  },

  updateView: function() {
    var button = document.getElementById("http-nowhere-button");
    if (button != null) {
      if (httpNowhere.button.isOn()) {
        button.image = "chrome://http-nowhere/skin/button-on.24.png";
        button.tooltipText = "HTTP-Nowhere Enabled";
      } else {
        button.image = "chrome://http-nowhere/skin/button-off.24.png";
        button.tooltipText = "HTTP-Nowhere Disabled";
      }
    }
  },

  toggleState: function() {
    if (httpNowhere.button.isOn()) {
      // turn it off, restoring original proxy configuration
      var origProxyType = Services.prefs.getIntPref("extensions.http_nowhere.origproxy.type");
      var origProxyHttp = Services.prefs.getCharPref("extensions.http_nowhere.origproxy.http");
      var origProxyHttpPort = Services.prefs.getIntPref("extensions.http_nowhere.origproxy.http_port");
      Services.prefs.setIntPref("network.proxy.type", origProxyType);
      Services.prefs.setCharPref("network.proxy.http", origProxyHttp);
      Services.prefs.setIntPref("network.proxy.http_port", origProxyHttpPort);
    } else {
      // turn it on, remembering original proxy config and switch to a bogus proxy so http requests won't resolve
      var origProxyType = Services.prefs.getIntPref("network.proxy.type");
      Services.prefs.setIntPref("extensions.http_nowhere.origproxy.type", origProxyType);
      Services.prefs.setIntPref("network.proxy.type", 1); // manual

      var origProxyHttp = Services.prefs.getCharPref("network.proxy.http");
      var origProxyHttpPort = Services.prefs.getIntPref("network.proxy.http_port");
      Services.prefs.setCharPref("extensions.http_nowhere.origproxy.http", origProxyHttp);
      Services.prefs.setIntPref("extensions.http_nowhere.origproxy.http_port", origProxyHttpPort);
      Services.prefs.setCharPref("network.proxy.http", "localhost");
      Services.prefs.setIntPref("network.proxy.http_port", 4);
      if (Services.prefs.getBoolPref("network.proxy.share_proxy_settings")) {
          Services.prefs.setBoolPref("network.proxy.share_proxy_settings", false);
      }
    }
    httpNowhere.button.updateView();
  },
}

window.addEventListener("load", httpNowhere.button.init, false);
