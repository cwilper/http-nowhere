function click(e) {
  console.log('clicky');
  chrome.extension.getBackgroundPage().say('hi');
  window.close();
}

document.addEventListener('DOMContentLoaded', function () {
  // attach event listeners
  var toggle = document.getElementById('toggle');
  toggle.addEventListener('click', toggleState);
  var recent = document.getElementById('recent');
  recent.addEventListener('click', showTabForItem);
  var recent = document.getElementById('options');
  recent.addEventListener('click', showTabForItem);

  // TODO: update menu items based on current state
});

function toggleState(e) {
  chrome.extension.getBackgroundPage().say('toggling');
  window.close();
}

function showTabForItem(e) {
  var filename = e.target.id + '.html';
  var pageUrl = chrome.extension.getURL(filename);

  chrome.tabs.query({url: pageUrl}, function(tabs) {
    if (tabs.length) {
      chrome.tabs.update(tabs[0].id, {active: true});
    } else {
      chrome.tabs.create({url: pageUrl});
    }
  });
  window.close();
}
