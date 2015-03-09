var util = require('util');
var skill = require('./skill');
var debug = require('debug')('killing_game:actor');
var player = require('./player');

function Actor (opt) {
  this.name = 'stupid actor';
  this.tags = ['actor'];
  this.actions = [];
  this.temp_effect = [];

  this.add_skill(skill.speak);
  this.add_skill(skill.vote);
  util._extend(this,opt);
}

util._extend(Actor.prototype,{
  act : function( skill, optns, done ) {
    var self = this;
    var skill = this['@'+skill];
    skill.cast(optns,done);
  },
  is : player.prototype.is,
  is_not : player.prototype.is_not,
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