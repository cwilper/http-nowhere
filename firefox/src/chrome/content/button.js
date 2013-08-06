Components.utils.import("resource://gre/modules/Services.jsm");

function isOn() {
  return Services.prefs.getIntPref("network.proxy.type") == 1 // manual
      && Services.prefs.getCharPref("network.proxy.http") == "localhost"
      && Services.prefs.getIntPref("network.proxy.http_port") == 4;
}

function updateView() {
  var button = document.getElementById("http-nowhere-button");
  if (button != null) {
    if (isOn()) {
      button.image = "chrome://http-nowhere/skin/button-on.24.png";
      button.tooltipText = "HTTP-Nowhere Enabled";
    } else {
      button.image = "chrome://http-nowhere/skin/button-off.24.png";
      button.tooltipText = "HTTP-Nowhere Disabled";
    }
  }
}

function toggleState() {
  if (isOn()) {
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
  updateView();
}

// Shortly after startup, update the view and show the installed message, if needed
setTimeout(function() {

  // if this is the first run...
  if (!Services.prefs.getBoolPref("extensions.http_nowhere.ranonce")) {
    // 1) put the button on the toolbar if not already there
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

    // 2) give a quick one-time usage message
    Services.prompt.alert(null, "HTTP-Nowhere is now installed", "Just click the lock button in the toolbar to enable or disable it.\n\nWhile enabled, all unencrypted web requests will fail with a proxy error.");
    Services.prefs.setBoolPref("extensions.http_nowhere.ranonce", true);
  }
  updateView();
}, 1500);

// Utility code to support changing the view whenever proxy settings change
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get
  // garbage collected.
  this._branch = Services.prefs.getBranch(branch_name);
  this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  this._callback = callback;
}

PrefListener.prototype.observe = function(subject, topic, data) {
  if (topic == 'nsPref:changed')
    this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(trigger) {
  this._branch.addObserver('', this, false);
  if (trigger) {
    let that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
  }
};

PrefListener.prototype.unregister = function() {
  if (this._branch)
    this._branch.removeObserver('', this);
};

// Update the view anytime proxy settings change.
var myListener = new PrefListener("network.proxy.", function(branch, name) {
 updateView();
});
myListener.register(true);
