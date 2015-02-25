
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
  this.skill             = 'vote';
  debug('new stage', optn );
  util._extend(this,optn);
}

util._extend(Stage.prototype,{
  settle : function( target ) {
    target.tags.push('dead');
    debug('actor dead!!!');
    debug( target );
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
  get_can_be_vote: function( actors ) {
    var self = this;
    return actors.filter(function( actor ) {
      debug('check can be vote', actor.tags, self.can_not_be_vote_in);
      if( _.intersection( actor.tags, self.can_not_be_vote_in ).length ){
        return false;
      } else {
        return true;
      }
    }); 
  },
  act : function( all_actors, game, done ) {
    var actors = this.get_can_active(all_actors);

    debug('actors', 
      actors.length, 
      actors.map(function(actor) {
        return [actor.id,actor.tags];
      }) 
    );

    if( !actors.length ){
      done();
      return;
    }
    var self = this;
    var skill = self.skill;
    if( !skill ){
      self.settle(actors);
      done();
      return;
    }
    debug('act skill', skill);
    if( skill == 'speak' ){
      async.eachSeries( actors,function( actor, done ) {
        actor.act( skill, actors, done );
      }, done );
      return;
    } 
    else if( skill == 'vote' ){
      var can_be_votes = this.get_can_be_vote(all_actors);
      async.whilst(function() {
        if( can_be_votes.length <= 1 ){
          debug(
            'can_be_votes', 
            can_be_votes.map(function(actor) {
              return [actor.id,actor.tags];
            })
          );
        }
        return can_be_votes.length > 1;
      },function( done ) {
        // update vote cache;
        can_be_votes.forEach(function( actor ) {
          actor.temp_effect = [];
        });
        // vote
        async.each(actors,function( actor, done) {
          actor.act( skill, can_be_votes, done );
        },function(){
          var grouped = _.groupBy(can_be_votes,
                          function( actor ) {
                            return actor.temp_effect.length;
                          });
          var max_vote_count = _.max(_.keys(grouped).map(Number));
          can_be_votes = grouped[max_vote_count];
          done();
        });
      },function() {
        can_be_votes.length && self.settle( can_be_votes[0] );
        done();
      });
    }
  }
});

module.exports= Stage;