
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
  cast : function( optns, done ) {
    var self = this;
    var targets = optns.targets;
    var owner = this.owner;
    this.get_target( 
      this.get_valid_targets(targets),
      function( err, target ) {
        self.effect( target );

        owner.actions.push({
          stage: optns.stage.type,
          info : optns.info,
          turns: optns.turns,
          skill: self.name,
          does : target.id
        });

        done();
      });
  }
});

Skill.speak = new Skill({
  name : 'speak',
  cast : function( optns, done ) {
    var owner = this.owner;
    var message= 'my name is ' + owner.name;

    debug( message );

    owner.actions.push({
      stage: optns.stage.type,
      info : optns.info,
      turns: optns.turns,
      skill: this.name,
      does : message
    });

    done(null,{
      id      : this.id, 
      message : message
    });
  }
});

Skill.vote  = new Skill({
  name : 'vote',
  effect : function( target ) {
    target.temp_effect.push(this.owner.id);
  }
});


Skill.create_pc_action = function( optns ) {
  optns = optns || {};
  var name = optns.name;
  if( !name ){
    throw new Error( 'skill name must be given');
  }
  var option = {
    name : name,
    cast : function( optns, done ) {
      var targets = optns.targets;
      var self = this;

      var owner = this.owner;
      var player = owner.player;
      var socket = owner.sck;

      var vote_timer;
      var timeout = 60*1e3;
      var effect_cache;
      function end () {
        debug('end skill', name);
        clearTimeout(vote_timer);
        socket.emit('end_@' + name);
        socket.removeAllListeners('@' + name);
        socket.removeAllListeners('cancel_@' + name);
        var ret = self.effect(effect_cache);
        owner.actions.push({
          stage: optns.stage.type,
          info : optns.info,
          turns: optns.turns,
          skill: name,
          does : effect_cache
                  ?(effect_cache.id || effect_cache)
                  : effect_cache
        });
        done(null, ret);
        end = function() {}
      }
      debug('start skill', name);
      socket.emit('start_@' + name,{
          info   :optns.info,
          targets:targets.map(function( target ) {
                    return player.see( target );
                  })
        });
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
  optns = optns || {};
  delete optns.name;
  var options = {
                  name : 'vote',
                  effect : function( target ) {
                    target.temp_effect.push(this.owner.id);
                  }
                };
  util._extend( options, optns );
  return Skill.create_pc_action(options);
};
Skill.pc_speak = function( optns ) {
  optns = optns || {};
  delete optns.name;
  var options = {
                  name : 'speak',
                  effect : function( msg ) {
                    return {
                      id      : this.owner.id,
                      message : msg
                    };
                  }
                };
  util._extend( options, optns );
  return Skill.create_pc_action(options);
};
module.exports= Skill;