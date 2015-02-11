var util = require('util');
var random_data = require('random_data');
var _ = require('lodash');

// 
// 技能
// 由于不存在非指向性技能（即是碰撞生效技能），
// 因此直接选取目标。
// 假定目标只能为1。
// 
// 由于规则限制，使用后不会立即结算。
// 

function Skill(opt) {
  this.name = null;
  this.owner = null;

  this.target_type = [];
  this.effect = function( target ) {
    
  };
  util._extend(this,opt);
}

util._extend(Skill.prototype,{
  get_valid_targets : function( targets ) {
    var self = this;
    return targets;
  },
  get_target : function( targets, done ) {
    done(null, random_data.randomItem(targets));
  },
  cast : function( targets, done ) {
    var self = this;
    this.get_target( 
      this.get_valid_targets(targets),
      function( err, target ) {
        self.effect( target );
        done();
      });
  }
});

Skill.speak = new Skill({
  name : 'speak',
  cast : function( targets, done ) {
    console.log( 'my name is ', this.owner.name );
    done();
  }
});

Skill.vote  = new Skill({
  name : 'vote',
  effect : function( target ) {
    target.temp_effect.push(this);
  }
});

Skill.pc_speak = new Skill({
  name : 'speak',
  cast : function( targets, done) {
    this.owner.sck
      .to(this.owner.room)
      .emit('my name is '+ this.owner.name);
    done();
  }
});

Skill.pc_vote  = new Skill({
  name : 'vote',
  cast : function( targets, done ) {
    var self = this;
    var socket = this.owner.sck;
    var vote_timer;
    var timeout = 15*1e3;
    socket.emit('start_vote',targets);
    socket.on('voted',function( target ) {
      target.temp_effect.push(self);
      clearTimeout(vote_timer);
      done();
    });
    vote_timer = setTimeout(function() {
      socket.removeAllListener('voted');
      done();
    },timeout);
  }
});

module.exports= Skill;