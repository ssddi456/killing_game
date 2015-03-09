require([
  './js/simple_animate_flow',
  './js/helpers',
  './js/lock',
  './js/player',
  './js/bindings'
],function(
  simple_animate_flow,
  helpers,
  lock,
  player,
  bindings
){
 

  var socket = io.connect('/');
  vm = {};
  helpers(vm);
  
  var noop = function() {};

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
  vm.hovered_player= ko.observable();
  
  vm.gaming  = ko.observable(false);

  vm.messages = ko.observableArray([]);
  vm.send = vm.cancel_send = noop;
  
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

  socket.on('game_start',function() {
    vm.page('game');
    vm.gaming(true);
  });
  socket.on('game_end',function() {
    vm.gaming(false);
  });

  socket.on('trans_day',function() {
    vm.night(false);
  });
  socket.on('trans_night',function() {
    vm.night(true);
  });

  socket.on('list_players',function(players) {
    var c_players = vm.players();
    // 找到现有的和新增的，同步状态
    players.forEach(function( man ) {
      var c_player = _.find(c_players,function(player) {
        return player.id == man.id;
      });
      if( c_player ){
      } else {
        c_player = new player();
        vm.players.push(c_player);
      }
      c_player.sync(man);

      var me = vm.me();
      if( man.id == me.id ){
        me.sync(man);
      }
    });
    // 找到不再存在的，移除
    c_players.filter(function( c_player ) {
      return players.every(function( player ) {
        return player.id != c_player.id;
      });
    }).forEach(function( c_player) {
      vm.players.remove(c_player);
    });
  });

  socket.on('speak', function( msg ) {
    if( msg.id ){
      vm.players().filter(function( player ) {
        return player.id == msg.id;
      }).forEach(function( player ) {
        player.saying( msg.message );
      });
    }
  });

  socket.on('command_start',function( msg ) {
    vm.command.running(0);
    vm.command(msg);
    vm.command.running(1);
  });
  socket.on('command_end',function() {
    vm.command.running(2);
  });

  vm.command = simple_animate_flow('');

  function on_skill( name, handlers ) {
    var skilling = name.replace(/e?$/,'ing');
    vm[ skilling ] = ko.observable( false );

    socket.on('stage_start_@'+name,function() {
      vm[ skilling ] = ko.observable( true );
    });

    socket.on('stage_end_@'+name,function() {
      vm[ skilling ] = ko.observable( false );
    });

    socket.on( 'start_@' + name,function( datas ) {
      (vm[name + '_message'] = vm[name + '_message'] || ko.observable(''))(datas.info);


      handlers.start(datas.targets, function( err, res ) {
        if( err ) {
          socket.emit('cancel_@' + name );
        } else {
          socket.emit('@' + name, res);
        }
      });
    });

    socket.on('end_@' + name,
      function() {
        vm[name + '_message']('');
        handlers.finish.call(handlers);
      });
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
        this.prev_page = undefined;

        vm.send =
        vm.cancel_send = noop;
      }
    });

  vm.can_vote = ko.observable(false);
  vm.get_voted_class = function( $data ) {
    //
    // 如果不在投票环节就跳过。
    // 如果在投票环节，
    //   如果目标不能被投，
    //     返回不可用
    //   如果目标能够被投，并且自己还可以投票，
    //     返回可用
    //   如果自己已经投过，并且目标被投过票
    //     返回被投了
    //
    console.log( vm.voting(), $data.can_be_vote(), vm.can_vote() );
    if( !vm.voting() ){

    } else {
      if( !$data.can_be_vote() ){
        return 'disable';
      }
      if( vm.can_vote() ){
        return 'enable';
      } 
      if( $data.temp_effect.length ){
        return 'voted';
      }
    }
    return '';
  };
  on_skill('vote',
    {
      start  : function( targets, done ) {
        var _lock = lock();
        var end = _lock(function() {
          _lock.lock();
          done.apply(null,arguments);
        });

        vm.players().forEach(function( player ) {
          var target = targets.filter(function( target ) {
            return target.id == player.id;
          });
          player.can_be_vote( target.length != 0 );
        });

        vm.can_vote(true);
        vm.send = _lock(function( $data ) {
                    vm.can_vote(false);
                    end( null, $data );
                  });
        vm.cancel_send =_lock(function() {
                          vm.can_vote(false);
                          end( 'canceled' );
                        });
      },
      finish :function() {
        vm.send =
        vm.cancel_send = noop;
      }
    });

  ko.applyBindings(vm);
  window.vm = vm;
});