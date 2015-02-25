require([
  './js/helpers',
  './js/lock',
  './js/player',
  './js/bindings'
],function(
  helpers,
  lock,
  player,
  bindings
){
 

  var socket = io.connect('http://localhost:8027');
  vm = {};
  helpers(vm);

  socket.on('error',function() {
    console.error( arguments );
  });
  socket.on('stat',function( me ) {
    if( !vm.me || vm.me() ){
      (vm.me = vm.me || ko.observable())(new player( socket.id ));
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
  
  vm.night = ko.observable(true);

  vm.room_name = ko.observable();
  vm.roommates = ko.observableArray([]);
  vm.players = ko.observableArray([]);

  vm.messages = ko.observableArray([]);
  vm.send = vm.cancel_send = function() {};
  
  vm.speak_somethings = ko.observable();
  vm.votes_targets = [];
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
      var me = vm.me();
      if( man.id == me.id ){
        me.sync(man);
      }
    });
  });

  socket.on('leave_room', function() {
    vm.page('hall');
    vm.roommates.removeAll();
  });

  socket.on('speak', function( msg ) {
    vm.messages.push(msg);
  });

  function on_skill( name, handlers ) {
    socket.on( 'start_@' + name,function( datas ) {
      handlers.start(datas, function( err, res ) {
        if( err) {
          socket.emit('cancel_@' + name );
        } else {
          socket.emit('@' + name, res);
        }
      });
    });
    socket.on('end_@' + name,
      handlers.finish.bind(handlers));
  }

  on_skill('speak',
    {
      start  : function( nss, done) {
        this.prev_page = vm.page();
        var _lock = lock();
        var end = _lock(function() {
          _lock.lock();
          done.apply(null,arguments);
        });

        vm.send = _lock(function() {
                    end( null, vm.speak_somethings() );
                  });
        vm.cancel_send =_lock(function() {
                          end( 'canceled' );
                        });
        vm.page('speak');
      },
      finish :function() {
        vm.page(this.prev_page);
        vm.speak_somethings('');
        // gc reference;
        vm.send =
        this.prev_page = 
        vm.cancel_send = null;
      }
    });

  on_skill('vote',
    {
      start  : function( targets, done ) {
        var _lock = lock();
        var end = _lock(function() {
          _lock.lock();
          done.apply(null,arguments);
        });
        vm.votes_targets = ko.observableArray(targets);

        vm.send = _lock(function( $data ) {
                    end( null, $data );
                  });
        vm.cancel_send =_lock(function() {
                          end( 'canceled' );
                        });
        
        this.prev_page = vm.page();
        vm.page('vote');
      },
      finish :function() {
        vm.page( this.prev_page );
        this.prev_page =
        vm.votes_targets =
        vm.send =
        vm.cancel_send = null;
      }
    });

  ko.applyBindings(vm);
});