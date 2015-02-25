process.env.DEBUG = 'killing_game:*';
var path = require('path');
var fs = require('fs');
var path = require('path');
var url = require('url');
var less = require('less');
var io = require('socket.io');

var express = require('express');
var app = express();

var http = require('http');
var server = http.Server(app);

var debug = require('debug')('killing_game:main');

var game = require('./libs/game');
var actor = require('./libs/actor');
var skill = require('./libs/skill');

var game_infos = require('./imps/game_infos');

app.set('view engine','jade');
app.set('views', path.join(__dirname,'./views'));
var static_path = __dirname + '/statics';
app.get('*.less',function( req, resp, next ) {
  
  var file = path.join(static_path,url.parse(req.url).pathname);
  fs.readFile( file, 'utf8', function(err, code) {
    if(err){
      return next(err);
    }
    less.render(code,
      { 
        filename : path.basename(file),
        paths    : [path.dirname(file)]
      },
      function(err, tree) {
        
        err
          ? (console.log(err),next(err))
          : resp.end( tree && tree.css );
      });
  })
});

app.use(express.static(static_path));

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
var public_room_prefix = game_infos.public_room_prefix;


function broadcast_player_stat ( room ) {
  var players = game_infos.get_roomplayers(room);
  var pcs     = game_infos.get_room_pcplayers(room);
  debug('-------- sync player state -------');
  if( players.length ){
    debug( room, 'exists');
    pcs.forEach(function( player ) {
      debug('sync player states', player.id);
      var player_maped = players.map(player.see.bind(player));
      debug('player_maped', player_maped, player_maped.length );
      player.sck.emit('list_roommates', player_maped);
    });
  }
  debug('-------- sync player state end -------');
}

function sync_room_stats(room) {
  io.to(room)
    .emit('list_roommates',
      game_infos.get_roommates(room));
}

io = io(server);
game_infos.host( io.sockets.adapter );
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
    return socket.__proto__.leave.apply(this,arguments);
  };

  socket.on('join_room',function( e ){
    socket.leave(default_channel);
    io.to(e.room)
      .emit('notice', socket.id + ' enter');
    socket.join(e.room);
    socket.emit('enter_room', e.room);
    io.to(e.room)
      .emit('list_roommates',game_infos.get_roommates(e.room));
  });

  socket.on('make_room',function( e ) {
    var new_room_key = public_room_prefix + 
                        random_data.String(' {[0-9]:3}{[a-z]:2}');

    socket.leave(default_channel);
    socket.join( new_room_key );
    player.is_roommaster = true;

    io.to(default_channel)
      .emit('list_rooms',game_infos.get_public_rooms());

    socket
      .emit( 'enter_room', new_room_key )
      .emit( 'list_roommates', game_infos.get_roommates(new_room_key, socket.id));
  });

  socket.on('leave_room',function( e ) {
    var room = e.room;
    player.is_roommaster = false;

    if( game_infos.room_exists(room) ){
      debug( 'player leave', player.id, room );
      socket.leave(room);
      io.to(room)
        .emit('player_leave', socket.id)
        .emit('list_roommates', game_infos.get_roommates(room))
    } else {
      debug( 'player leave', room, 'not exists');
    }

    socket.join(default_channel);
    socket.emit('leave_room');
    io.to(socket.id)
      .emit('list_rooms',game_infos.get_public_rooms());
    setTimeout(function() {
      debug('list_rooms', game_infos.get_public_rooms());
      debug('roommates', game_infos.get_roommates(room));
    })
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
    var room = player.room;
    var roommates = game_infos.get_roomplayers(room);
    if( player.is_roommaster 
      && roommates
          .filter(function( mate ) {
            return !mate.is_roommaster && !mate.is_ready;
          }).length == 0
    ){
      var game_instance = game.create();
      game_infos.start_game( room, game_instance );

      var shuffle = require('./libs/shuffle');
      var actors = ['killer',
                    'police',
                    'actor',
                    'actor',
                    'actor',
                    'killer',
                    'doctor',
                    'police'];

      actors = shuffle(actors.slice(0,6));
      debug('actors', actors);

      var game_actors = actors.map(function( role, i ){
        mate = roommates[i];
        if(mate){
          var pc = new actor( mate );
          pc.player = mate;
          pc.role = mate.role = role;

          pc.tags.push( pc.role );
          mate.tags = pc.tags;

          debug('new pc', pc.id, pc.tags );

          pc.remove_skill('vote');
          pc.remove_skill('speak');

          pc.add_skill(skill.pc_vote({
            effect : function( target ) {
              if( !target ){
                return;
              }
              target = game_actors.filter(function( actor) {
                return actor.id == target.id;
              })[0];
              target.temp_effect.push(pc);
            }
          }));

          pc.add_skill(skill.pc_speak({
            effect : function( message ) {
              io.to(room).emit('speak', message);
            }
          }));
          return pc;
        } else {
          var npc = new actor();
          npc.id = 'npc '+ random_data.String(8);
          npc.role = role;
          npc.tags.push(role);
          npc.tags.push('npc');
          return npc;
        }
      });
      game_instance.command.call = function( done, key ) {
        var infos;
        if( typeof this.call_info[key] == 'function' ){
          infos = this.call_info[key](this);
        } else {
          infos = this.call_info[key];
        }
        io.to(room).emit('speak', infos);
        setTimeout(done,1e3);
      };

      game_instance.set_actors(game_actors);
      game_instance.on_end = function( survivers ) {
        socket.emit('game_end');
        game_infos.end_game(room);
        game_infos.get_roomplayers( room )
          .forEach(function( player ) {
            player.reset();
          });

        broadcast_player_stat( room );
      };

      game_instance.on_stage_end = function() {
        debug(' stage name ', this.stages[this.stage_cursor] );
        debug(' stage end  ', this.stage_cursor);
        debug(' turns end  ', this.turns);
        if( this.stages[this.stage_cursor]  == 'sunrise'
          || this.stages[this.stage_cursor] == '#call::nights' 
        ){
          broadcast_player_stat( room );
        }
      };

      game_instance.init();
      io.to(room).emit('game_start');
      game_instance.run();
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