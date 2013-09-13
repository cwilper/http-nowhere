chrome.browserAction.onClicked.addListener(function() {
  console.log('popup goes here..');
});

chrome.browserAction.setBadgeText({"text":"10"});
chrome.browserAction.setBadgeBackgroundColor({"color":"#dd0"});
