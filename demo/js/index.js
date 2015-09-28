var d = {};

d.ready = function() {
  tooltipper.load("tooltips/index.json");
  $("#btn-1").click(function() {$('#ul-1').append('<li><span>Added #1</span></li>');});
  $("#btn-2").click(function() {$('#ul-2').append('<li><span>Added #2</span></li>');});
};

$(document).ready(d.ready);
