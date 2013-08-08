EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

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
    return httpNowhere.prefs.branch.setBoolPref("firstRun", value);
  },

  getMaxRecentlyBlockedHosts: function() {
    return httpNowhere.prefs.branch.getIntPref("maxRecentlyBlockedHosts");
  },

  getMaxRecentlyBlockedURLsPerHost: function() {
    return httpNowhere.prefs.branch.getIntPref("maxRecentlyBlockedURLsPerHost");
  }
}
