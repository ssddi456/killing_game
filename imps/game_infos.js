var storage = require('../libs/storage');

var player = require('../libs/player');

var game_info = module.exports;

var pairs = {};
var player_infos = {};

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
  console.log( sckid, ssid);
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
