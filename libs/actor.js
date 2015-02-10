var util = require('util');
var skill = require('./skill');

function Actor (opt) {
  this.name = 'stupid actor';
  this.tags = ['actor'];

  this.add_skill(skill.speak);
  this.add_skill(skill.vote);

  util._extend(this,opt);
}

util._extend(Actor.prototype,{
  act : function( skill, targets, done ) {
    var self = this;
    var skill = this['@'+skill];
    skill.cast(targets,done);
  },
  is : function( tag ) {
    return ~this.tags.indexOf(tag);
  },
  add_skill : function( skill ) {
    skill = Object.create(skill);
    this['@' + skill.name ] = skill;
    skill.owner = this;
  }
});


module.exports = Actor;