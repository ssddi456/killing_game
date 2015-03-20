
var util = require('util');
var debug = require('debug')('killing_game:stage');
var _ = require('lodash');
var async = require('async');

//
// 每一轮所有人只能以相同身份使用技能，
// 技能只有两种类型，投票或扯淡。
// 投票只能有一个人被投出，
// 如果没有最多票数的结果，
// 选出最多票数的人进行重投。
// 投票完成后结算。
// 

function Stage ( optn ) {
  this.can_active_in     = [];
  this.can_not_active_in = [];
  this.can_not_be_vote_in= [];
  this.type              = '';
  this.name              = '';
  this.skill             = 'vote';
  this.min_act_time      = 3e3;
  debug('new stage', optn );
  util._extend(this,optn);
}

util._extend(Stage.prototype,{
  settle : function( target ) {
    target.tags.push('dead');
    debug('actor dead!!!');
    debug( target );
    return {killed : target};
  },
  get_can_active : function( actors ) {
    var self = this;
    return actors.filter(function( actor ) {
      debug('check can active', actor.tags, self.can_not_active_in, self.can_active_in);
      if( self.can_not_active_in 
        && self.can_not_active_in.length 
        && _.intersection( actor.tags, self.can_not_active_in ).length 
      ){
        return false;
      } else if( !self.can_active_in 
        || !self.can_active_in.length
        || _.intersection( actor.tags, self.can_active_in ).length 
      ){
        return actor;
      }
    });
  },
  get_can_be_vote: function( actors, me ) {
    var self = this;
    return actors.filter(function( actor ) {
      debug('check can be vote', actor.tags, self.can_not_be_vote_in);
      if( _.intersection( actor.tags, self.can_not_be_vote_in ).length ){
        return false;
      } else {
        if( me && actor.id != me.id ){
          return false;
        }
        return true
      }
    }); 
  },
  act : function( all_actors, game, done ) {
    var self = this;
    var actors = this.get_can_active(all_actors);
    var timeout = Date.now() + this.min_act_time;
    function finish() {
      debug('stage finish', self.type, self.name);
      var argv = arguments;
      var delta =  Math.max(0, timeout - Date.now());
      finish = function() {}
      setTimeout(function() {
        done.apply(null,argv);
      },delta);
    }
    debug('stage start',this.type, this.name);
    debug('actors', 
      actors.length, 
      actors.map(function(actor) {
        return [actor.id,actor.tags];
      })
    );

    if( !actors.length ){
      finish();
      return;
    }
    var skill = self.skill;
    if( !skill ){
      self.settle(actors);
      finish();
      return;
    }
    debug('act skill', skill);
    var act_info = {
      stage   : self,
      info    : self.name,
      turns   : game.turns
    };
    if( skill == 'speak' ){
      debug('speak start');
      async.eachSeries( actors,function( actor, done ) {
        debug('speak on', actor.id );
        actor.sck && actor.sck.emit('stage_start_@speak');
        actor.act( skill, 
                    util._extend(act_info,{
                      targets : actors
                    }),
                    function( err, words ){
                      actor.sck && actor.sck.emit('stage_end_@speak');
                      game.emit('speak',words);
                      done();
                    });
      },finish);
    } 
    else if( skill == 'vote' ){
      debug('vote start ', self.name);
      var can_be_votes = this.get_can_be_vote(all_actors);
      var sub_so = game.to( 
                    actors.filter(function( actor ) {
                      return actor.sck;
                    }));
      sub_so.emit('stage_start_@' + skill);
      var vote_times = 0;
      async.whilst(function() {
        if( can_be_votes.length <= 1 ){
          debug(
            'can_be_votes', 
            can_be_votes.map(function(actor) {
              return [actor.id,actor.tags];
            })
          );
        }
        if( vote_times != 0 ){
          act_info.info = self.name +', 请统一意见';
        }
        return can_be_votes.length > 1;
      },function( done ){
        // update vote cache;
        can_be_votes.forEach(function( actor ) {
          actor.temp_effect = [];
        });
        // vote
        game.broadcast_player_stat();
        async.each(actors,function( actor, done) {

          actor.act( skill, 
                      util._extend(act_info,{
                        targets : can_be_votes
                      }),
                      function() {
                        // let the others know the choice
                        sub_so.broadcast_player_stat();
                        done();
                      });
        },function(){
          vote_times += 1;
          var grouped = _.groupBy(can_be_votes,
                          function( actor ) {
                            return actor.temp_effect.length;
                          });
          var max_vote_count = _.max(_.keys(grouped).map(Number));
          can_be_votes = grouped[max_vote_count];
          done();
        });
      },function() {
        sub_so.emit('stage_end_@' + skill);
        var ret = can_be_votes.length && self.settle( can_be_votes[0] );
        finish(null,ret);
      });
    }
  }
});

module.exports= Stage;