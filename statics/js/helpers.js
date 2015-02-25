define([
  './player',
  './random_data'
],function(
  player,
  random_data
){


  return function( vm ) {
    vm.add_room = function() {
      vm.rooms.push(
        random_data.String(16));
    };
    vm.add_roommate = function() {
      vm.roommates.push(
        new player( 
          random_data.String(16)));
    };
    vm.add_player = function() {
      vm.players.push(
        new player( 
          random_data.String(16)));
    };
    vm.add_message = function() {
      vm.messages.push(
        random_data.String(16));
    };
  }
});