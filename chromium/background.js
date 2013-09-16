var n = 0;

chrome.browserAction.onClicked.addListener(function() {
  n += 1;
  chrome.browserAction.setBadgeText({"text": n + ""});
});

chrome.browserAction.setBadgeBackgroundColor({"color":"#ee0"});
