var debug = require('debug')('killing_game:game_name');
var game = module.exports;

game.stages = [
  'start',
  'ifNotEnd#loop',
  'end'
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
      done();
    }
  },
  start : {
    act : function( all_actors, game, done ){
      done();
    }
  },
  ifEnd : {
    act : function(  all_actors, game, if_true, if_not_true ) {
      if( false ){
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
      game.turns += 1;
      // goto start 
      game.stage_cursor = 1; 
      done();
    }
  },
  end  : {
    act : function(  all_actors, game, done ) {
      game.stage_cursor = game.stages.length - 2;
      done();
    }
  }
}

game.init= function() {
    
}