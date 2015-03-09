define([

],function(

){
  var ret = function( val ) {
    var ret = ko.observable(val);
    ret.running = ko.observable(0);
    return ret;
  };

  return ret;
});