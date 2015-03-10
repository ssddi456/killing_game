define([
  './player',
  './random_data'
],function(
  player,
  random_data
){
  return function( vm ) {
    vm.tools= ko.observable(false);
    vm.toggle_skill_stage = function( key ) {
      return function() {
        vm[key](!vm[key]());
      }
    };
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
    vm.test_command = function(n) {
      vm.command.running(n);
    };
    vm.random_saying = function() {
      var players = vm.players();
      var player = players[Math.floor(Math.random()*players.length)];
      player.saying('测试说一句话');
    };
  }
});