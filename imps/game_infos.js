var debug = require('debug')('killing_game:game_info');

var storage = require('../libs/storage');

var player = require('../libs/player');

var game_info = module.exports;

var public_room_prefix = 
game_info.public_room_prefix = 'killing_room_';

var pairs = {};
var player_infos = {};
var running_games = {};
var adapter;


game_info.record_pair = function( sckid, ssid ) {
  pairs[sckid] = ssid;
};

game_info.get_player_by_sck = function( ssid, sck ) {
  var ret = this.get_player_by_ssid(ssid);
  ret.sck = sck;
  this.record_pair(sck.id,ssid);
  return ret;
};

game_info.get_player_by_sckid = function( sckid ) {
  var ssid = pairs[sckid];
  return this.get_player_by_ssid(ssid);
};

game_info.get_players_by_sckid = function( sckids ) {
  var self = this;
  return sckids.map(function( sckid ) {
    return self.get_player_by_sckid(sckid).get_stat();
  });
};

game_info.get_player_by_ssid = function( ssid ) {
  if( !player_infos[ssid] ){
    player_infos[ssid] = new player(ssid);
  }
  return player_infos[ssid]; 
};

game_info.start_game = function( room, game_instance ) {
  running_games[room] = game_instance;
}

game_info.end_game = function( room ) {
  running_games[room] = undefined;
}

game_info.is_playing = function( room ) {
  return running_games[room];
}

game_info.host = function( _adapter ) {
  adapter = _adapter;
}


game_info.get_public_rooms = function() {
  return Object.keys(adapter.rooms)
          .filter(function( k ) {
            return k.indexOf(public_room_prefix) == 0;
          });
}

game_info.get_roommates= function ( room ) {
  var room = this.room_exists(room);
    return room 
            ? this.get_players_by_sckid(
                Object.keys(room))
            : [];
}
game_info.get_roomplayers= function (room) {
  var self = this;
  var game = this.is_playing(room);
  var room = this.room_exists(room) || [];

  if(game){
    return game.actors;
  }

  return Object.keys(room)
          .map(function( key ) {
            return self.get_player_by_sckid(key);
          });
}
game_info.get_room_pcplayers=function(room) {
  var self = this;
  var room = this.room_exists(room) || [];

  return Object.keys(room)
          .map(function( key ) {
            return self.get_player_by_sckid(key);
          });
}
game_info.room_exists = function ( room ) {
  return adapter.rooms && adapter.rooms[room];
}