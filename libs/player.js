var debug = require('debug')('killing_game:player');

var player = module.exports = function( ssid, sck ) {
  // boolean
  this.is_roommaster = false;

  // play as role
  // unknown
  // police
  // xxx
  this.role = 'unknown';

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

pp.send_fail = function( message ) {
  this.sck.emit('fail', message);
};
pp.send_stat = function() {
  this.sck.emit('stat', this.get_stat());
};

pp.get_stat = function() {
  debug('check info', this.id );
  return {
    is_roommaster : this.is_roommaster,
    role          : this.role,
    room          : this.room,
    is_ready      : this.is_ready,
    is_ob         : this.is_ob,
    id            : this.id,
    tags          : this.tags,
  };
};

pp.see = function( another ) {
  var stat = another.get_stat 
              ? another.get_stat() 
              : another;

  debug('check tags', this.tags, another.tags );
  debug('check role', this.role, another.role );
  debug( ' - will see', stat.role );
  debug( this.id, another.id );
  debug( ' - is_ob', this.is_ob, another.is_ob );

  debug( ' - is_dead', 
    this.tags.indexOf('dead') != -1
    && another.tags.indexOf('dead') != -1 );

  debug( ' - not actor', 
    this.role == another.role 
    && this.role != 'actor' );

  debug( ' - inspected', 
    another.tags.indexOf('known_by_police') != -1
    && this.role == 'police' );

  debug( ' - same person', 
    this.id == another.id);

  var inbrief = this.is_ob 
                || another.is_ob
                || this.tags.indexOf('dead') != -1
                || another.tags.indexOf('dead') != -1
                || (this.role == another.role 
                  && this.role != 'actor')
                || (another.tags.indexOf('known_by_police') != -1
                  && this.role == 'police' )
                || this.id == another.id;

  debug(' - inbrief', inbrief  );

  if( inbrief ){
  } else {
    stat.role = 'unknown';
  }

  return stat;
}