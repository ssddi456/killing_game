var stage = require('./stage');
var actor = require('./actor');
var _ = require('lodash');
var debug = require('debug')('killing_game:game');

var stages =  [
                '#call::nights',
                '#call::killers',
                'killers',
                '#call::polices',
                'polices',
                '#call::doctors',
                'doctors',
                '#call::day',
                'sunrise',
                '#ifEnd#end',
                '#call::discribe',
                'discribe',
                '#call::votes',
                'votes',
                'judgements',
                '#ifNotEnd#loop',
                '#call::end'
              ];

var game = {};

game.stages = stages;
game.command = {
  call  : function( done, key ) {
    debug('command call!');
    if( typeof this.call_info == 'function' ){
      debug( this.call_info[key](this) );
    } else {
      debug( this.call_info[key] );
    }
    done();
  },
  ifEnd : function( done, if_ture ) {
    var living_killer = this.grouped_actors.killer
                          .filter(function(actor) {
                            return !_.include(actor.tags,'dead');
                          });
    var living_non_killer= this.grouped_actors.non_killer
                            .filter(function(actor) {
                              return !_.include(actor.tags,'dead');
                            });
    debug('check livings');
    debug('living_killer     : ', living_killer.length);
    debug('living_non_killer : ', living_non_killer.length);
    debug('');
    if( living_killer.length != 0
      &&living_non_killer.length != 0
    ){
      debug('game wont end');
      done();
    } else {
      debug('game will end');
      if_ture( done );
    }
  },
  ifNotEnd : function( done, if_ture ) {
    this.command.ifEnd.call(this,function() {
      if_ture(done);
    },function(){
      done();
    });
  },
  loop : function( done ) {
    debug('----');
    debug('---- round', this.turns, 'end' );
    var survivers = this.actors.filter(function( actor ) {
      return !_.include(actor.tags,'dead');
    });
    debug('---- survivers', survivers );
    this.turns += 1;
    this.stage_cursor = 0;
    done();
  },
  end  : function( done ) {
    this.stage_cursor = this.stages.length - 2;
    done();
  }
};
game.stage_sets ={
  killers    : {
    can_active_in : ['killer'],
    can_not_active_in : ['dead'],
    can_not_be_vote_in : ['killer','dead'],
    settle : function( target ) {
      target.tags.push('will_be_killed');
    }
  },
  polices    : {
    can_active_in : ['police'],
    can_not_active_in : ['dead'],
    can_not_be_vote_in : ['police','dead','known_by_police'],
    settle : function( target ) {
      target.tags.push('known_by_police');
    }
  },
  doctors    : {
    can_active_in : ['doctor'],
    can_not_active_in : ['dead'],
    can_not_be_vote_in : ['doctor','dead'],
    settle : function( target ) {
      target.tags.push('emergency_heal');
    }
  },
  sunrise : {
    can_active_in : ['will_be_killed','emergency_heal','fester'],
    skill : null,
    settle : function( actors ) {
      actors.forEach(function( actor ) {
        if( _.include(actor.tags,'emergency_heal') ){
          if( _.include(actor.tags,'fester')){
            actor.tags.push('dead');
            debug('actor dead!!!');
            debug( actor );
          } else {
            _.remove(actor.tags,function( tag ) {
              return tag == 'will_be_killed' 
                  || tag == 'emergency_heal';
            });
            actor.tags.push('fester');
          }
        } 
        else if( _.include(actor.tags,'will_be_killed') ){
          _.remove(actor.tags,function( tag ) {
            return tag == 'will_be_killed' 
                || tag == 'fester';
          });
          actor.tags.push('dead');
          debug('actor dead!!!');
          debug( actor );
        }
        else{
          _.remove(actor.tags,function( tag ) {
            return tag == 'fester';
          });
        }
      });
    }
  },
  new_deads  : {
    can_active_in : ['first_dead']
  },

  discribe   : {
    skill : 'speak',
    can_not_active_in : ['dead'],
  },

  judgements      : {
    can_not_active_in : ['dead'],
    can_not_be_vote_in : ['doctor','dead']
  }
};



game.call_info = {
  nights    : '天黑请闭眼',
  killers   : '杀手请杀人',
  polices   : '警察请搜查',
  doctors   : '医生请救人',
  day       : '天亮请睁眼',
  new_deads : '死者是....',
  discribe  : '各位请陈述',
  votes     : '幸存者投票',
  end       : function( game ) {
    if( game.actors.every(function( actor ) {
          return actor.is('living') && actor.is('killer');
        })
    ){
      return '大屠杀....';
    }

    return '正义的力量';
  }
};
game.parse_stage = function( str ) {
  var ret;
  debug('stage', str );
  var self = this;
  str.replace(/^(#([^#:]+)(#(.+)|::(.+))?)|([^#:]+)$/,
    function(
      $,
      full_commands,
      command_name,
      command_body,
      secondary_command_name,
      command_argv,
      stage
    ){
      // debug('full_commands          :' , full_commands);
      // debug('command_name           :' , command_name);
      // debug('command_body           :' , command_body);
      // debug('secondary_command_name :' , secondary_command_name);
      // debug('command_argv           :' , command_argv);
      // debug('stage                  :' , stage);

      if( stage ){
        ret = self.stage_sets[stage];
        if( !ret ){
          ret = function( done ) {
            done();
          };
        } else {
          ret = ret.act.bind(ret, self.actors, self );
        }
      } else if ( command_name && command_argv ){
        ret = function( done ) {
          debug('command ', command_name);
          self.command[command_name].call(self, done, command_argv);
        };
      } else if ( command_name && secondary_command_name ){
        ret = function( done ) {
          debug('command ', command_name);
          debug('secondary_command_name', secondary_command_name);
          self.command[command_name].call( self, done, 
            self.command[secondary_command_name].bind(self));
        };
      }
    });
  return ret;
};

game.set_actors = function( actors ) {
  this.actors = actors;
  this.grouped_actors = _.groupBy( this.actors ,function( actor ) {
                          for(var i = 0, n = actor.tags.length,tag;
                            tag = actor.tags[i],i < n;
                            i++
                          ){
                            if( tag == 'killer' ){
                              return tag;
                            }
                          }
                          return 'non_killer';
                        });
}
game.stage_cursor = 0;
game.stage_count = stages.length;
game.turns       = 0;

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
game.create = function() {
  var ret       = Object.create(game);
  ret.stages    = Object.create(game.stages);
  ret.command   = Object.create(game.command);
  ret.call_info = Object.create(game.call_info);
  ret.stage_sets= Object.create(game.stage_sets);

  var _temp,stage_set;
  for(var _stage_name in ret.stage_sets ){
    _temp = {};
    stage_set = ret.stage_sets[_stage_name];
    for(var pp in stage_set){
      if( stage_set.hasOwnProperty(pp)){
        _temp[pp] = stage_set[pp];
      }
    }
    ret.stage_sets[_stage_name] = _temp;
  }
  

  ret.init= function(){
    for(var _stage_name in this.stage_sets ){
      this.stage_sets[_stage_name] = new stage(this.stage_sets[_stage_name]);
    }
  };

  ret.on_stage_end = 
  ret.on_end = function( survivers ){};

  ret.run = function() {
    debug('start of game!!!');
    var stage = this.get_stage();
    var self = this;
    if( stage ){
      stage(function() {
        ret.on_stage_end();
        self.next_stage();
      });
    }
  };

  return ret;
}
module.exports = game;