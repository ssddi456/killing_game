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
    id            : this.id,
    tags          : this.tags.slice(0),
    actions       : this.actions.slice(0),
    temp_effect   : this.temp_effect
  };
};

pp.see = function( another, game_end ) {
  var stat = another.get_stat 
              ? another.get_stat() 
              : another;

  stat.tags = _.uniq(stat.tags);

  if(game_end){
    return stat;
  }

  debug('check tags', this.tags, another.tags );
  debug('check role', this.role, another.role );
  debug( ' - will see', stat.role );
  debug( this.id, another.id );
  debug( ' - is_ob', this.is_ob, another.is_ob );

  debug( ' - is_dead', 
    this.is('dead')
    && another.is('dead'));

  debug( ' - not actor', 
    this.role == another.role 
    && this.role != 'actor' );

  debug( ' - inspected', 
    another.is('known_by_police')
    && this.role == 'police' );

  debug( ' - same person', 
    this.id == another.id);

  var inbrief = this.is_ob 
                || another.is_ob
                || this.is('dead')
                || another.is('dead')
                || (this.role == another.role 
                  && this.role != 'actor')
                || (another.is('known_by_police')
                  && this.role == 'police' )
                || this.id == another.id;

  debug(' - inbrief', inbrief  );

  if( inbrief ){
    if( !game_end ){
      if( this.is_not('doctor') ){
        stat.tags = _.without(stat.tags,'fester');
      }
      if( this.is_not('police') ){
        stat.tags = _.without(stat.tags,'known_by_police');
      }
      if( this.is_not('killer') ){
        stat.tags = _.without(stat.tags,'will_be_killed');
      }
    }
  } else {
    stat.role = 'unknown';
    var _tags = ['unknown'];
    if( another.is('fester') && this.is('doctor') ){
      _tags.push('fester');
    }
    stat.tags = _tags;
  }

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