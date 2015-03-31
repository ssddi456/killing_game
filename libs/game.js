var _ = require('lodash');
var debug = require('debug')('killing_game:game');
var game_infos = require('../imps/game_infos');
var game = {};


game.stage_sets = {};



game.parse_stage = function( str ) {
  var ret;
  debug('stage', str );
  var self = this;
  var cmd = {};

  str.replace(/^(([^#.]+)(#(.+)|\.(.+))?)|([^#.]+)$/,
    function(
      $,
      full_commands,
      stage_name,
      command_body,
      secondary_command_name,
      command_argv,
      stage
    ){
      // debug('full_commands          :' , full_commands);
      // debug('stage_name             :' , stage_name);
      // debug('command_body           :' , command_body);
      // debug('secondary_command_name :' , secondary_command_name);
      // debug('command_argv           :' , command_argv);
      // debug('stage                  :' , stage);

      cmd.stage = stage || stage_name;
      cmd.command_argv = command_argv;
      cmd.secondary_command_name = secondary_command_name;
    });
  return this.build_stage(cmd);
};
game.build_stage = function( parse_stage_cmd ){
  var self = this;
  debug( 'parse_stage_cmd', parse_stage_cmd );
  var stage =self.stage_sets[parse_stage_cmd.stage];
  if( !stage ){
    return function( done ) {
      done();
    };
  }
  var args = [self.actors,self];
  var ret = function ( done ){
    args.push(done);
    stage.act.apply(stage,args);
  }

  if ( parse_stage_cmd.secondary_command_name ){
    debug('build_stage add secondary_command_name', parse_stage_cmd.secondary_command_name );
    // for if_true and if_not_true
    args.push(function( done ){
      self.parse_stage(parse_stage_cmd.secondary_command_name)(done);
    });
  } 
  if( parse_stage_cmd.command_argv ){
    debug('build_stage add command_argv', parse_stage_cmd.command_argv );
    args.push(parse_stage_cmd.command_argv);
  }
  return ret;
}
game.set_actors = function( actors ) {
  this.actors = actors;
}

game.get_stage = function() {
  var cur_stage_desc = this.stages[this.stage_cursor];
  if( !cur_stage_desc ){
    return;
  }
  return this.parse_stage(cur_stage_desc);
};

game.next_stage = function () {
  this.stage_cursor += 1;
  var self = this;
  var stage = this.get_stage();
  if( stage ){
    debug( ':::: next stage ::::', stage.name);
    stage(function() {
      self.on_stage_end();
      self.next_stage();
    });
  } else {
    this.end();
  }
};

game.end = function() {
  var survivers = this.actors.filter(function( actor ) {
    return !_.include(actor.tags,'dead');
  });
  debug( 'finish @ round ', this.turns );
  debug( 'end of game!!! survivers : ', survivers );
  this.on_end( survivers );
};
game.create = function( room_id, room ) {
  var ret       = Object.create(game);
  
  ret.load_game = function( name ){
    var game_configs = require('./games/' + name );
    for(var k in game_configs){
      if( game_configs.hasOwnProperty(k) ){
        this[k] = game_configs[k];
      }
    }
    this.stage_cursor = 0;
    this.stage_count = this.stages.length;
    this.turns       = 0;
  };

  ret.emit= function() {
    room.emit.apply(room,arguments);
  };

  ret.to = function( actors ) {
    var so = Object.create(room);
    debug( 'build sub so ', actors );
    var rooms = actors.map(function( actor ) {
                  return actor.sck.id;
                });
    var pcs = rooms.map(function( id ) {
                return game_infos.get_player_by_sckid(id);
              });
    debug( 'sub so', rooms, pcs );
    so.rooms = rooms;
    so.broadcast_player_stat = function( game_end ) {
      ret.broadcast_player_stat( game_end, pcs );
    };
    return so;
  }
  
  ret.init= function(){};

  ret.broadcast_player_stat = function  ( game_end, pcs ) {
    var pcs     = pcs || game_infos.get_room_pcplayers(room_id);
    var players = game_infos.get_roomplayers(room_id);
    debug('-------- sync player state -------');
    if( players.length ){
      debug( room_id, 'exists');
      pcs.forEach(function( player ) {
        // debug('sync player states', player.id);
        player_maped = players.map(function( other) {
          return player.see(other,game_end);
        });
        // debug('player_maped', player_maped, player_maped.length );
        player.sck.emit('list_players', player_maped);
      });
    }
    debug('-------- sync player state end -------');
  }
  ret.on_stage_end = 
  ret.on_end = function( survivers ){};

  ret.run = function() {
    debug('start of game!!!');
    var stage = this.get_stage();
    var self = this;
    if( stage ){
      stage(function( err, stage_end_message ) {
        ret.on_stage_end( err, stage_end_message );
        self.next_stage();
      });
    }
  };
  return ret;
}
module.exports = game;