var n = 0;

chrome.browserAction.onClicked.addListener(function() {
  n += 1;
  chrome.browserAction.setBadgeText({'text': n + ''});
});

chrome.webRequest.onBeforeRequest.addListener(function(details) {
  n += 1;
  chrome.browserAction.setBadgeText({'text': n + ''});
  var newUrl = 'https' + details.url.substring(4);
  console.log('Redirecting to ' + newUrl);
  return {'redirectUrl': newUrl};
}, {urls: ['http://*/*']}, ['blocking']);

chrome.browserAction.setBadgeBackgroundColor({'color':'#999'});
