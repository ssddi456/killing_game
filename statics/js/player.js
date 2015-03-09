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

    this.tags        = ko.observableArray([]);

    this.temp_effect = ko.observableArray([]);

    this.can_be_vote = ko.observable(false);

    this.actions = ko.observableArray();

    this.saying = ko.observable('');
    var timer;
    var self = this;
    this.saying.subscribe(function( val ) {
      if( val != '' ){
        clearTimeout(timer);
        timer = setTimeout(function() {
          self.saying('');
          timer = undefined;
        },3e3);
      }
    });
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
  pp.get_pos_class = function( n, idx ) {
    return 'crowds_with_' + n + ' pos_' + idx;
  }
  return player;
});