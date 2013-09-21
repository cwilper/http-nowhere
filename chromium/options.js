function selectItem(e) {
  // select the menuitem
  var menuitems = document.getElementsByClassName('menuitem');
  for (var i = 0; i < menuitems.length; i++) {
    menuitems[i].setAttribute('class', 'menuitem');
  }
  e.className = 'menuitem menuitem-selected';

  // activate the associated pane
  var panes = document.getElementsByClassName('options-pane');
  for (var i = 0; i < panes.length; i++) {
    panes[i].setAttribute('class', 'options-pane');
  }
  document.getElementById(e.id + 'Pane').className = 'options-pane options-pane-active';
}

document.addEventListener('DOMContentLoaded', function () {
  var menuitems = document.getElementsByClassName('menuitem');
  for (var i = 0; i < menuitems.length; i++) {
    menuitems[i].addEventListener('click', function(e) { selectItem(e.target); });
  }

  var closeButtons = document.getElementsByClassName('closeButton');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function() { window.close() });
  }

  selectItem(document.getElementById('general'));
});
