EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("chrome://http-nowhere/content/httpNowhere.button.js");
Components.utils.import("chrome://http-nowhere/content/httpNowhere.recent.js");

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
    return true;
  },

  ignoredPageLoaded: function(document, window) {
    return true;
  }
};
