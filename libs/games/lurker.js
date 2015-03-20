var debug = require('debug')('killing_game:lurker');
var game = module.exports;

var player = require('../player.js');
var skill = require('../skill');

var pc_speak = skill.pc_speak;
var pc_judgement = skill.create_pc_action({
  name : 'judgement',
  effect : function( target ){
    target.voted = target;
  }
});

// 
// tags : mc officer lurker dead
// 

game.stages = [
  'init',
  'give_words',
  'describe',
  'describe',
  'judgement'
];

var actor_list= [ 
                  'mc',
                  'officer',
                  'officer',
                  'lurker',
                  'officer',
                  'officer',
                  'lurker',
                  'lurker',
                  'officer',
                  'lurker',
                  'officer',
                  'officer',
                  'lurker',
                  'lurker',
                  'officer',
                  'lurker'
                ];

game.stage_sets = {
  template_stage  : {
    can_active_in : [],
    can_not_active_in : [],
    can_not_be_vote_in : [],
    settle : function( target ){

    },
    act : function( all_actors, game, done ){
      done();
    }
  },
  init  : {
    act : function( all_actors, game, done ){
      // give everyone a name
      // give everyone a role and a keyword
    }
  },
  describe : {
    skill : 'speak',
    act : function( all_actors, game, done ){
      // call everyone to describe the keyword one by one
      done();
    }
  },
  judgement : {
    can_not_be_vote_in : ['dead'],
    act : function(  all_actors, game, done ) {
      var self = this;
      var async = require('async');
      function clear_up(){
        all_actors.forEach(function( actor){
          actor.voted = undefined;
        })
      }
      async.eachSeries(all_actors,function( actor, done ){
        if( actor.is('dead') ){
          return done();
        }
        clear_up();

        actor.act('vote', 
          self.get_can_be_vote(all_actors,actor),function(){
            var voted = all_actors.filter(function( actor ){ return actor.voted; });
            if( voted.role == voted.voted.role ){
              voted.tags.push('dead');
            } else {
              actor.tags.push('dead');
            }
            done();
          });
      },
      done);
    }
  }
}

game.init = function(){

}
