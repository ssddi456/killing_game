var player = module.exports = function( ssid, sck ) {
  // boolean
  this.is_roommaster = false;

  // play as role
  // unknown
  // police
  // xxx
  this.role = 'unknown';

  // boolean
  this.is_dead = false;

  // pos
  this.room = 'hall';

  // boolean, ready for game
  this.is_ready= false;

  // if watch game
  this.is_ob = false;

  this.id = ssid;

  // handle sck for send changing message
  this.sck = sck;

  this.tag = [];
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
  this.is_dead  = false;
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
  console.log('check info', this.id );
  return {
    is_roommaster : this.is_roommaster,
    role          : this.role,
    is_dead       : this.is_dead,
    room          : this.room,
    is_ready      : this.is_ready,
    is_ob         : this.is_ob,
    id            : this.id
  };
};

pp.see = function( another ) {
  var stat = another.get_stat 
              ? another.get_stat() 
              : another;
  if( this.is_ob 
    || this.is_dead
    || another.is_dead
    || another.is_ob
    ||(another.tag.indexOf('know_by_police')
      && this.role == 'police' )
  ){
    return stat
  }
  stat.role = 'unknown';
  return stat;
}