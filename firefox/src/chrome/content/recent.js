EXPORTED_SYMBOLS = ["httpNowhere"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://http-nowhere/content/prefs.js");

if ("undefined" === typeof(httpNowhere)) var httpNowhere = {};

httpNowhere.recent = {

  hostInfo: {},

  blockCount: 0,

  clear: function() {
    httpNowhere.recent.hostInfo = {};
    httpNowhere.recent.blockCount = 0;
  },

  addURI: function(uri) {
    var now = new Date().getTime();

    // update hostInfo as appropriate
    var hostInfo = httpNowhere.recent.hostInfo[uri.host];
    if (hostInfo == null) {
      // add new host to the recent hostInfo list
      hostInfo = {
        blockCount: 0,
        urlInfo: {}
      };
      httpNowhere.recent.hostInfo[uri.host] = hostInfo;
      if (Object.keys(httpNowhere.recent.hostInfo).length > httpNowhere.prefs.getMaxRecentlyBlockedHosts()) {
        // delete the hostInfo with the oldest blocked date
        var orderedHostnames = httpNowhere.recent.getKeysOrderedByLastBlockedDate(httpNowhere.recent.hostInfo);
        delete httpNowhere.recent.hostInfo[orderedHostnames[orderedHostnames.length - 1]];
      }
    }
    hostInfo.blockCount += 1;
    hostInfo.lastBlockedDate = now;

    // update hostInfo.urlInfo as appropriate
    var urlInfo = hostInfo.urlInfo[uri.spec];
    if (urlInfo == null) {
      urlInfo = {
        blockCount: 0
      };
      hostInfo.urlInfo[uri.spec] = urlInfo;
      if (Object.keys(hostInfo.urlInfo) > httpNowhere.prefs.getMaxRecentlyBlockedURLsPerHost()) {
        // delete the urlInfo with the oldest blocked date
        var orderedUrls = httpNowhere.recent.getKeysOrderedByLastBlockedDate(hostInfo.urlInfo);
        var oldUrlInfo = hostInfo.urlInfo[orderedUrls[orderedUrls.length - 1]];
        delete hostInfo.urlInfo[orderedUrls[orderedUrls.length - 1]];
        // recalculate the block count for this hostInfo
        hostInfo.blockCount -= oldUrlInfo.blockCount;
      }
    }
    urlInfo.blockCount += 1;
    urlInfo.lastBlockedDate = now;

    // recalculate the global block count
    var blockCount = 0;
    for (var hostname in httpNowhere.recent.hostInfo) {
      blockCount += httpNowhere.recent.hostInfo[hostname].blockCount;
    }
    httpNowhere.recent.blockCount = blockCount;
  },

  getKeysOrderedByLastBlockedDate: function(info) {
    return Object.keys(info).sort(function(a, b) {
      return info[a].lastBlockedDate - info[b].lastBlockedDate;
    });
  },
}
