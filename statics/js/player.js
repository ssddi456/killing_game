define([
  
],function(
  
){
  function player ( id ) {
    this.id  = id;
    // boolean
    this.is_roommaster = ko.observable(false);

    // play as role
    this.role = ko.observable('police');

    // pos
    this.room = ko.observable('hall');

    // boolean, ready for game
    this.is_ready= ko.observable(false);

    // if watch game
    this.is_ob = ko.observable(false);

    this.tags = ko.observableArray(['']);
  }
  var pp =player.prototype;
  pp.sync = function( player ) {
    for(var k in player){
      if( player.hasOwnProperty(k) ){
        typeof this[k] == 'function' 
                ? this[k]( player[k] )
                : this[k] = player[k];
      }
    }
  };
  return player;
});