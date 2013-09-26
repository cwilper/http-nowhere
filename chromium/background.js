var httpNowhere = {

  init: function() {
    chrome.webRequest.onBeforeRequest.addListener(httpNowhere.observe,
        {urls: ['http://*/*']}, ['blocking']);
    chrome.browserAction.setPopup({'popup':'popup.html'});
    httpNowhere.button.updateAppearance();
  },

  observe: function(details) {
    if (httpNowhere.prefs.isEnabled()) {
      httpNowhere.recent.blockCount += 1;
      httpNowhere.button.updateAppearance();
      var newUrl = 'https' + details.url.substring(4);
      // return {'redirectUrl': newUrl};
    }
  },

  toggleEnabled: function() {
    httpNowhere.prefs.setEnabled(!httpNowhere.prefs.isEnabled());
    httpNowhere.button.updateAppearance();
  },

  showPage: function(filename) {
    var pageUrl = chrome.extension.getURL(filename);
    chrome.tabs.query({url: pageUrl}, function(tabs) {
      if (tabs.length) {
        chrome.tabs.update(tabs[0].id, {active: true});
      } else {
        chrome.tabs.create({url: pageUrl});
      }
    });
  }
};

httpNowhere.button = {
  updateAppearance: function() {
    chrome.browserAction.setBadgeBackgroundColor({'color':'#999'});
    if (httpNowhere.recent.blockCount > 0) {
      chrome.browserAction.setBadgeText({'text': httpNowhere.recent.blockCount + ''});
    } else {
      chrome.browserAction.setBadgeText({'text': ''});
    }
  }
};

httpNowhere.prefs = {
  _enabled: true,

  isEnabled: function() {
    return httpNowhere.prefs._enabled;
  },

  // https://chrome.google.com/webstore/detail/storage-area-explorer/ocfjjjjhkpapocigimmppepjgfdecjkb
  setEnabled: function(value) {
    console.log('setEnabled(' + value + ')');
    httpNowhere.prefs._enabled = value;
    chrome.storage.local.set({'enabled': value});
  }
};

httpNowhere.recent = {
  recent: {
    blockCount: 0
  }
};

httpNowhere.init();
