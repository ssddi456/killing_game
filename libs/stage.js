var util = require('util');
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
  util._extend(this,optn);
}

util._extend(Stage.prototype,{
  settle : function( target ) {
    target.tags.push('dead');
    console.log('actor dead!!!');
    console.log( target );
  },
  get_can_active : function( actors ) {
    var self = this;
    return actors.filter(function( actor ) {
      if( _.intersection( actor.tags, self.can_not_active_in ).length ){
        return false;
      } else if( _.intersection( actor.tags, self.can_actives_in ) ){
        return actor;
      }
    });
  },
  get_can_be_vote: function( actors ) {
    var self = this;
    return actors.filter(function( actor ) {
      if( _.intersection( actor.tags, self.can_not_be_vote_in ).length ){
        return false;
      } else {
        return true;
      }
    }); 
  },
  act : function( actors, game, done ) {
    var actors = this.get_can_active(actors);

    console.log('actors', actors.length );

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
    if( skill == 'speak' ){
      async.eachSeries( actors,function( actor, done ) {
        actor.act( skill, actors, done );
      }, done );
      return;
    } 
    else if( skill == 'vote' ){
      var can_be_votes = this.get_can_be_vote(actors);
      async.whilst(function() {
        if( can_be_votes.length <= 1 ){
          console.log('can_be_votes', can_be_votes );
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
        },function() {
          var grouped = _.groupBy(can_be_votes,
                          function( actor ) {
                            return actor.temp_effect.length;
                          });
          var max_vote_count = _.max(_.keys(grouped).map(Number));
          can_be_votes = grouped[max_vote_count];
          done();
        });
      },function() {
        self.settle( can_be_votes[0] );
        done();
      });
    }
  }
});

module.exports= Stage;