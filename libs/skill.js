
var util = require('util');
var debug = require('debug')('killing_game:skill');
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


Skill.create_pc_action = function( optns ) {
  var name = optns.name;
  if( !name ){
    throw new Error( 'skill name must be given');
  }
  var option = {
    name : name,
    cast : function( targets, done ) {
      var self = this;
      var player = this.owner.player;
      var socket = this.owner.sck;
      var vote_timer;
      var timeout = 15*1e3;
      var effect_cache;
      function end () {
        clearTimeout(vote_timer);
        socket.emit('end_@' + name);
        socket.removeAllListeners('@' + name);
        socket.removeAllListeners('cancel_@' + name);
        self.effect(effect_cache);
        done();
        end = function() {}
      }
      socket.emit('start_@' + name,
        targets.map(function( target ) {
          return player.see( target );
        }));
      socket.on( '@' + name,function( target ) {
        debug( name, target );
        effect_cache = target;
        end();
      });
      socket.on('cancel_@' + name,function() {
        end();
      });
      vote_timer = setTimeout(function() {
        end();
      },timeout);
    }
  };
  util._extend(option,optns);
  return new Skill(option);
};

Skill.pc_vote  = function( optns ) {
  delete optns.name;
  var options = {
                  name : 'vote',
                  effect : function( target ) {
                    target.temp_effect.push(this);
                  }
                };
  util._extend( options, optns );
  return Skill.create_pc_action(options);
};
Skill.pc_speak = function( optns ) {
  delete optns.name;
  var options = {
                  name : 'speak',
                  cast : function( targets, done) {
                    this.owner.sck
                      .to(this.owner.room)
                      .emit('my name is '+ this.owner.name);
                    done();
                  }
                };
  util._extend( options, optns );
  return Skill.create_pc_action(options);
};
module.exports= Skill;