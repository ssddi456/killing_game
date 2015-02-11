require([
  './js/player',
  './js/bindings'
],function(
  player,
  bindings
){
 

  var socket = io.connect('http://localhost:8027');
  var vm = {};

  socket.on('error',function() {
    console.error( arguments );
  });

  socket.on('stat',function( me ) {
    if( !vm.me() ){
      vm.me(new player( socket.id ));
      vm.me().sync(me);
      if( me.room != 'hall' ){
        socket.emit('join_room',{room : me.room});
      } else {
        socket.emit('leave_room',{room : undefined});
      }
    } else {
      vm.me().sync(me);
    }
  });

  vm.page = ko.observable('hall');
  vm.rooms = ko.observableArray([]);

  vm.room_name = ko.observable();
  vm.roommates = ko.observableArray([]);

  vm.before_click = function(){
    var me = vm.me();
    if( !me.is_roommaster() 
      && me.is_ready() 
    ){
      return false;
    }
    return true;
  };
  vm.make_room = function() {
    socket.emit('make_room');
  };
  vm.leave_room = function() {
    socket.emit('leave_room', {room : vm.room_name()});
  };
  vm.join_room = function( $data ) {
    socket.emit('join_room', { room : $data});
  };

  vm.start_game = function() {
    if( vm.me().is_roommaster() ){
      socket.emit('start_game');
    }
  };

  vm.ready_for_game = function() {
    if( !vm.me().is_ready() ){
      socket.emit('ready_for_game');
    } else {
      socket.emit('cancel_ready');
    }
  };

  socket.on('list_rooms',function( rooms ){
    vm.rooms.removeAll();
    rooms.forEach(function(room) {
      vm.rooms.push(room);
    });
  });

  socket.on('enter_room',function( new_room_key ) {
    vm.page('room');
    vm.room_name(new_room_key);
    vm.rooms.removeAll();
  });

  socket.on('list_roommates',function( roommates ) {
    vm.roommates.removeAll();
    roommates.forEach(function( man ) {
      vm.roommates.push(man); 
    });
  });

  socket.on('leave_room',function() {
    vm.page('hall');
    vm.roommates.removeAll();
  });

  ko.applyBindings(vm);
});