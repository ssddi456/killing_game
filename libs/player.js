var debug = require('debug')('killing_game:player');
var _ = require('underscore');

var player = module.exports = function( ssid, sck ) {
  // boolean
  this.is_roommaster = false;

  // play as role
  // unknown
  // police
  // xxx
  this.role = 'unknown';
  this.name = '';
  // pos
  this.room = 'hall';

  // boolean, ready for game
  this.is_ready= false;

  // if watch game
  this.is_ob = false;

  this.id = ssid;

  // handle sck for send changing message
  this.sck = sck;

  this.tags = [];
  this.actions=[];
};

var pp = player.prototype;
pp.go_to_ob = function() {
  if( this.is_ob ){
    return this.send_stat();
  } 
  // 
  // 房管不能当ob
  // 
  if( this.is_roommaster ){
    return this.send_fail();
  }
  if( this.is_ready ){
    return this.send_fail();
  }
  this.is_ob    = true;
  this.is_ready = false;
  this.role     = 'observer';
  this.send_stat();
}
pp.reset = function() {
  this.actions.length =
  this.tags.length = 0;
  this.role = 'unknown';
  this.is_ready = false;
};
pp.send_fail = function( message ) {
  this.sck.emit('fail', message);
};
pp.send_stat = function() {
  this.sck.emit('stat', this.get_stat());
};
pp.is= function( tag ) {
  return ~this.tags.indexOf(tag);
};
pp.is_not= function(tag) {
  return !~this.tags.indexOf(tag);
};
pp.get_stat = function() {
  debug('check info', this.id );
  return {
    is_roommaster : this.is_roommaster || false,
    role          : this.role || '',
    room          : this.room || '',
    is_ready      : this.is_ready || false,
    is_ob         : this.is_ob || false,
    name          : this.name,
    id            : this.id,
    tags          : this.tags.slice(0),
    actions       : this.actions.slice(0),
    temp_effect   : this.temp_effect
  };
};

var tags_can_only_be_seen_by = {
  will_be_killed : ['killer'],
  known_by_police : ['police'],
  fester : ['doctor']
};

var role_can_only_seen_when = function( another, me ){
  if( another.id == me.id ){
    return true;
  }
  if( another.is('dead') ){
    return true;
  }
  if( another.is('known_by_police') 
    && me.is('police') 
  ){
    return true
  }
  if( another.role == me.role ){
    if( another.role !='actor' ){
      return true;
    }
    return false;
  }
  return false;
};

pp.see = function( another, game_end ) {
  var self = this;
  var stat = another.get_stat 
              ? another.get_stat() 
              : another;

  stat.tags = _.uniq(stat.tags);

  if(game_end){
    return stat;
  }

  var temp_role = stat.role;
  stat.role = role_can_only_seen_when( another, this ) ?  stat.role : 'unknown';
  stat.tags = stat.tags.filter(function( tag ){
    return !tags_can_only_be_seen_by[tag] 
          || tags_can_only_be_seen_by[tag].some(self.is.bind(self));
  }).map(function( tag ){
    if( tag == temp_role ){
      return stat.role;
    }
    return tag;
  });

  // 死者可以看到所有场景的动作
  // 其他人可以看到同角色的所有动作
  // 平民的动作可以被所有人看到
  if( this.is('dead') 
    || this.role == another.role
    || another.is('actor')
  ){
  } else {
    var can_see_killers = this.is('killer');
    var can_see_polices = this.is('police');
    var can_see_doctors = this.is('doctor');
    stat.actions = stat.actions.filter(function(action) {
      if( (action.stage == 'killers' && !can_see_killers) 
        || (action.stage == 'polices' && !can_see_polices) 
        || (action.stage == 'doctors' && !can_see_doctors) 
      ){
        return false;
      }
      return true;
    });
  }
  debug( 'end see', stat.tags );

  return stat;
}