var path = require('path');

var io = require('socket.io');

var express = require('express');
var app = express();

var http = require('http');
var server = http.Server(app);


var game = require('./libs/game');
var actor = require('./libs/actor');
var skill = require('./libs/skill');

var game_infos = require('./imps/game_infos');

app.set('view engine','jade');
app.set('views', path.join(__dirname,'./views'));
app.use(express.static(__dirname + '/statics'));

var bodyParser = require('body-parser');
app.use(bodyParser());
var cookieSession = require('cookie-session');

var session_handler = cookieSession({ 
  keys: ['killing', 'game'],
  maxAge:365*24*60*60*1000
});

app.use( session_handler );

var random_data = require('random_data');

app.get('/', function( req, resp ){
  if( ! req.session.session_key ){
    req.session.session_key = 
      random_data.String('{[a-z0-9]:4}-{[a-z0-9]:4}-{[a-z0-9]:4}-{[a-z0-9]:4}');
  }
  resp.render('index');
});


var default_channel = 'hall';
var public_room_prefix = 'killing_room_';
function get_public_rooms() {
  return Object.keys(io.sockets.adapter.rooms)
          .filter(function( k ) {
            return k.indexOf(public_room_prefix) == 0;
          });
}

function get_roommates( room, self ) {
  try{
    return game_infos.get_players_by_sckid(
            Object.keys(io.sockets.adapter.rooms[room]));
  }catch(e){
    return [];
  }
}
function sync_room_stats(room) {
  io.to(room)
    .emit('list_roommates',
      get_roommates(room));
}
io = io(server);
io.set('authorization',function( req, next ) {
  var fake_res = {};
  session_handler( req, fake_res, function() {
    console.log( 'author session', req.session );
    next(null, true);
  });
});

io.on('connection',function( socket ) {
  console.log( 'connected with session', socket.request.session );
  console.log( socket.id , 'connect' );

  var session_key = socket.request.session.session_key;
  var player      = game_infos.get_player_by_sck(session_key, socket);
  // console.log( 'player ', player );
  player.send_stat();

// 
// 大厅
// 创建房间时通知大厅中的玩家创建大厅
// todos:创建者成为master
// 
// 离开房间时加入大厅，通知 玩家离开
// todos: master离开时随机转交给玩家
// 玩家全体离开时销毁房间
// 销毁房间时所有ob回到大厅。
// 
// 房间数目发生变化时移除通知大厅玩家，
// 房间中玩家数目发生变化时，通知房间中其他玩家。
// 
// todos: 数据管理 base on cookie session and adapter?
// 
// hooks
//   socket.join
//   
  socket.join = function( room ) {
    player.room = room;
    return socket.__proto__.join.apply(this,arguments);
  };
  socket.leave = function( room ) {
    return socket.__proto__.join.apply(this,arguments);
  };

  socket.on('join_room',function( e ){
    socket.leave(default_channel);
    io.to(e.room)
      .emit('notice', socket.id + ' enter');
    socket.join(e.room);
    socket.emit('enter_room', e.room);
    io.to(e.room)
      .emit('list_roommates',get_roommates(e.room));
  });

  socket.on('make_room',function( e ) {
    var new_room_key = public_room_prefix + 
                        random_data.String(' {[0-9]:3}{[a-z]:2}');

    socket.leave(default_channel);
    socket.join( new_room_key );
    player.is_roommaster = true;

    io.to(default_channel)
      .emit('list_rooms',get_public_rooms());

    socket
      .emit( 'enter_room', new_room_key )
      .emit( 'list_roommates', get_roommates(new_room_key, socket.id));
  });

  socket.on('leave_room',function( e ) {
    var room = e.room;
    player.is_roommaster = false;

    if( io.sockets.adapter.rooms[room] ){
      socket.leave(room);
      io.to(room)
        .emit('player_leave', socket.id)
        .emit('list_roommates', get_roommates(room))
    }

    socket.join(default_channel);
    socket.emit('leave_room');
    io.to(default_channel)
      .emit('list_rooms',get_public_rooms());
  });

  socket.on('change_stat',function( e ) {
    io.to(e.room);
    if ( 'can' ){
      socket.emit('stat_change');
    } else {
      socket.emit('stat_change_fail');
    }
  });


  socket.on('ready_for_game',function() {
    player.is_ready = true;
    sync_room_stats( player.room );
  });

  socket.on('cancel_ready',function() {
    player.is_ready = false;
    sync_room_stats(player.room);
  });

  socket.on('start_game',function( e ) {
    var roommates = get_roommates(player.room);
    if( player.is_roommaster 
      && roommates
          .filter(function( mate ) {
            return !mate.is_roommaster && mate.is_ready;
          })
    ){
      io.to(e.room).emit('game_start');
      var game_instance = game.create();
      
      game.set_actors(
        roommates.map(function( mate ){
          var pc = new actor( mate );
          pc.remove_skill('vote');
          pc.remove_skill('speak');

          pc.add_skill();
          pc.add_skill();
        }));
      game.run();
      game.end = function() {
        socket.emit('game_end');
      }
    } else {
      socket.emit('start_game_fail');
    }
  });

  socket.on('vote',function( e ) {
    io.to(e.room).emit('voted','who vote on who');
  });

  // socket.emit('start_vote');
  // socket.emit('end_vote');

  // socket.emit('player_dead');
  // socket.emit('game_end');

  socket.on('chats',function( e ) {
    
  });
});

server.listen(8027);