document.addEventListener('DOMContentLoaded', function () {
  // update appearance based on current state
  var isEnabled = chrome.extension.getBack  

  // attach event listeners
  document.getElementById('toggle').addEventListener('click', function() {
    chrome.extension.getBackgroundPage().httpNowhere.toggleEnabled();
    window.close();
  });
  var showAndClose = function(e) {
    chrome.extension.getBackgroundPage().httpNowhere.showPage(e.target.id + ".html");
    window.close();
  }
  document.getElementById('recent').addEventListener('click', showAndClose);
  document.getElementById('options').addEventListener('click', showAndClose);
});

