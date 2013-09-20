function click(e) {
  console.log('clicky');
  chrome.extension.getBackgroundPage().say('hi');
  window.close();
}

console.log('running popup.js');

document.addEventListener('DOMContentLoaded', function () {
  console.log('adding DOMContentLoaded event listener');
  var divs = document.querySelectorAll('div');
  for (var i = 0; i < divs.length; i++) {
    divs[i].addEventListener('click', click);
  }
});
