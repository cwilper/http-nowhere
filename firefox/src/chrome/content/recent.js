EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://http-nowhere/content/prefs.js");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.recent = {

  hostInfo: {},

  clear: function() {
    httpNowhere.recent.hostInfo = {};
  },

  addURI: function(uri) {
    var now = new Date().getTime();

    var hostInfo = httpNowhere.recent.hostInfo[uri.host];
    if (hostInfo == null) {
      // add new host to the recent hostInfo list
      hostInfo = {
        blockCount: 0,
        hostname: uri.host,
        urlInfo: {}
      };
      httpNowhere.recent.hostInfo[uri.host] = hostInfo;
      if (Object.keys(httpNowhere.recent.hostInfo).length > httpNowhere.prefs.getMaxRecentlyBlockedHosts()) {
        // delete the host with the oldest blocked date
        // TODO: implement me
      }
    }
    hostInfo.blockCount += 1;
    hostInfo.lastBlockedDate = now;

    // add the url to the list of those blocked for this host
    var urlInfo = hostInfo.urlInfo[uri.spec];
    if (urlInfo == null) {
      // add new url to the urlInfo for this host
      urlInfo = {
        blockCount: 0
      };
      hostInfo.urlInfo[uri.spec] = urlInfo;
      if (Object.keys(hostInfo.urlInfo) > httpNowhere.prefs.getMaxRecentlyBlockedURLsPerHost()) {
        // delete the url with the oldest blocked date
        // TODO: implement me
      }
    }
    urlInfo.blockCount += 1;
    urlInfo.lastBlockedDate = now;
  },

  getKeysSortedByDate: function(info) {
    return Object.keys(info).sort(function(a, b) {
      return info[a].lastBlockedDate - info[b].lastBlockedDate;
    });
  }
}
