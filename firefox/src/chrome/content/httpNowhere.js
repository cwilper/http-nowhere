Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("chrome://http-nowhere/content/httpNowhere.button.js");
Components.utils.import("chrome://http-nowhere/content/httpNowhere.prefs.js");
Components.utils.import("chrome://http-nowhere/content/httpNowhere.recent.js");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.init = function() {
  // Add the button, update the view, and show the installed message, if needed
  setTimeout(function() {
    if (httpNowhere.prefs.isFirstRun()) {
      // put the button on the toolbar if not already there
      var navbar = document.getElementById("nav-bar");
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
         document.persist('nav-bar', 'currentset');
      }
      // give a quick one-time usage message
      Services.prompt.alert(null, "HTTP Nowhere is now installed", "Click the lock button to enable or disable it.\n\nWhile enabled, unencrypted web requests will fail.");
      httpNowhere.prefs.setFirstRun(false);
    }
    httpNowhere.button.updateAppearance();
  }, 0);

  // Observe interesting stuff
  Services.obs.addObserver(httpNowhere, "http-on-modify-request", false);
};

httpNowhere.observe = function(subject, topic, data) {
  if (topic == "http-on-modify-request" && httpNowhere.prefs.isEnabled()) {
    var request = subject.QueryInterface(Ci.nsIHttpChannel);
    if (request.URI.scheme == "http" && request.URI.host != 'localhost') {
      // signal that a block has occurred by briefly changing the badge
      var button = document.getElementById("httpNowhere-button");
      if (button != null) {
        if (button.getAttribute('status') != 'blocking') {
          button.setAttribute('status', 'blocking');
          setTimeout(function() {
            httpNowhere.button.updateAppearance();
          }, 500);
        }
      }
      // abort the request
      request.cancel(Components.results.NS_ERROR_ABORT);
      // update the recent list
      httpNowhere.recent.addURI(request.URI);
    }
  }
};

httpNowhere.toggleEnabled = function() {
  httpNowhere.prefs.setEnabled(!httpNowhere.prefs.isEnabled());
  httpNowhere.button.updateAppearance();
};

httpNowhere.clearRecent = function() {
  httpNowhere.recent.clear();
  httpNowhere.button.updateAppearance();
};

httpNowhere.copyValueOf = function(element) {
  var value = element.getAttribute('value');
  Services.prompt.alert(null, "Copied This:", value);
};

window.addEventListener("load", httpNowhere.init, false);
