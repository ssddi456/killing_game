var util = require('util');

function Actor () {
  this.tags = ['actor'];
  this.skills = [];
}
util._extend(Actor.prototype,{
  act : function( turn, stage, done ) {
    
  }
});
module.exports = Actor;