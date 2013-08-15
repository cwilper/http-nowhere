EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.rules = {

  allowedURLs: new Array(),
  
  bloqedURLs: new Array(),

  load: function() {
  },

  save: function() {
  },

  isAllowed: function(url) {
    return true;
  },

  isBloqed: function(url) {
    return false;
  }
};
