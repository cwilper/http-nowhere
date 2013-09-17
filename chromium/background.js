var n = 0;

chrome.browserAction.onClicked.addListener(function() {
  n += 1;
  chrome.browserAction.setBadgeText({"text": n + ""});
});

chrome.webRequest.onBeforeRequest.addListener(function(details) {
  n += 1;
  chrome.browserAction.setBadgeText({"text": n + ""});
  console.log(details.url);
}, {urls: ["http://*/*"]}, null);

chrome.browserAction.setBadgeBackgroundColor({"color":"#cc2"});
