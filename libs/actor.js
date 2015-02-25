var util = require('util');
var skill = require('./skill');
var debug = require('debug')('killing_game:actor');
var player = require('./player');

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
  is_not : function(tag) {
    return !~this.tags.indexOf(tag);
  },
  add_skill : function( skill ) {
    skill = Object.create(skill);
    this['@' + skill.name ] = skill;
    skill.owner = this;
  },
  remove_skill : function( skill_name ) {
    this['@' + skill_name ] = undefined;
  },
  get_stat : player.prototype.get_stat
});


module.exports = Actor;