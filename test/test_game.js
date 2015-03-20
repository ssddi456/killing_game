process.env.DEBUG = '*';
var game = require('../libs/game');

game = game.create();
game.init();
game.stages.forEach(function( stage_cmd ) {
  console.log( stage_cmd, '---' );
  game.parse_stage( stage_cmd );
})