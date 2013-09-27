var httpNowhere = chrome.extension.getBackgroundPage().httpNowhere;

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('toggle');
  var toggleImage = document.getElementById('toggleImage');
  var recent = document.getElementById('recent');
  var options = document.getElementById('options');

  // update appearance based on current state
  if (httpNowhere.prefs.isEnabled()) {
    toggleImage.setAttribute('src', 'images/icon19-off.png');
    toggle.lastChild.textContent = ' Pause HTTP Nowhere';
  } else {
    toggleImage.setAttribute('src', 'images/icon19-on.png');
    toggle.lastChild.textContent = ' Activate HTTP Nowhere';
  }
  recent.lastChild.textContent = ' Recently Blocked (' + httpNowhere.recent.blockCount + ')';

  // attach event listeners
  toggle.addEventListener('click', function() {
    httpNowhere.toggleEnabled();
    window.close();
  });
  var showAndClose = function(e) {
    httpNowhere.showPage(e.target.id + ".html");
    window.close();
  }
  recent.addEventListener('click', showAndClose);
  options.addEventListener('click', showAndClose);
});

function debug(message) {
  chrome.extension.getBackgroundPage().debug(message);
}
