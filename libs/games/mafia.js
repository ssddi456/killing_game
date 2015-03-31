var random_chinese_name = require('../random_chinese_name');
var async = require('async');
var debug = require('debug')('killing_game:mafia');
var stage = require('../stage');
var _ = require('lodash');

var stages =  [ 
                'gain_player_name',
                'call.night',
                'call.killers',
                'killers',
                'call.polices',
                'polices',
                'call.doctors',
                'doctors',
                'call.day',
                'sunrise',
                'ifEnd#end',
                'call.discribe',
                'discribe',
                'call.judgements',
                'judgements',
                'ifNotEnd#loop',
                'call.end'
              ];

var game = module.exports;

game.stages = stages;
game.get_call_info = function( key) {
  if( typeof this.call_info[key] == 'function' ){
    try{
      return this.call_info[key](this);
    } catch(e){
      debug('get_call_info failed', e);
      return key;
    }
  } else {
    return this.call_info[key];
  }  
};

game.stage_sets ={
  call  : {
    act : function( all_actors, game, key, done ) {
            var infos = game.get_call_info(key);
            if( key == 'day' || key == 'night' ){
              game.emit('trans_'+key);
            }
            game.emit('command_start', infos);
            setTimeout(function() {
              game.emit('command_end');
              done();
            },1e3);
          }
  },
  ifEnd : {
    act : function(  all_actors, game, if_true, if_not_true ) {
      var living_killer = game.grouped_actors.killer
                            .filter(function(actor) {
                              return !_.include(actor.tags,'dead');
                            });
      var living_non_killer= game.grouped_actors.non_killer
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
        if_not_true();
      } else {
        debug('game will end');
        if_true( if_not_true );
      }
    }
  },
  ifNotEnd : {
    act : function(  all_actors, game, if_true, if_not_true ) {
      var ifEnd = game.stage_sets.ifEnd;
      ifEnd.act(all_actors,game,
        function(){
          if_not_true();
        },
        function(){
          if_true(if_not_true);
        });
    }
  },
  loop : {
    act : function(  all_actors, game, done ) {
      debug('----');
      debug('---- round', game.turns, 'end' );
      var survivers = game.actors.filter(function( actor ) {
        return !_.include(actor.tags,'dead');
      });
      debug('---- survivers', survivers );
      game.turns += 1;
      game.stage_cursor = 1;
      done();
    }
  },
  end  : {
    act : function(  all_actors, game, done ) {
      game.stage_cursor = game.stages.length - 2;
      done();
    }
  },
  gain_player_name : {
    act : function( all_actors, game, done ) {
      async.each(all_actors,
        function( actor, done ){
          random_chinese_name(function(err,name){
            if( err ){
              debug('create random_name failed', name );
            }
            actor.name = err ? actor.id : name;
            done();
          })
        },done);
    }
  },
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
        if( actor.is('emergency_heal') ){
          if( actor.is('fester') ){
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
        else if( actor.is('will_be_killed') ){
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
  night     : '天黑请闭眼',
  killers   : '杀手请杀人',
  polices   : '警察请搜查',
  doctors   : '医生请救人',
  day       : '天亮请睁眼',

  new_deads : '死者是....',
  discribe  : '各位请陈述',
  judgements: '幸存者投票',
  end       : function( game ) {
    if( game.actors
          .filter(function( actor ) {
            return actor.is_not('dead')
          })
          .every(function( actor ) {
            return actor.is('killer');
          })
    ){
      return '大屠杀....';
    }

    return '正义的力量';
  }
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
};

game.init= function(){
  var _temp,stage_set;
  for(var _stage_name in this.stage_sets ){
    _temp = {};
    stage_set = this.stage_sets[_stage_name];
    for(var pp in stage_set){
      if( stage_set.hasOwnProperty(pp)){
        _temp[pp] = stage_set[pp];
      }
    }
    this.stage_sets[_stage_name] = _temp;
  }
  
  for(var _stage_name in this.stage_sets ){
    this.stage_sets[_stage_name] = new stage(this.stage_sets[_stage_name]);
    this.stage_sets[_stage_name].type = _stage_name;
    this.stage_sets[_stage_name].name = this.get_call_info(_stage_name);
  }
};