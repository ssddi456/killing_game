var path = require('path');

var io = require('socket.io');

var express = require('express');
var app = express();

var http = require('http');
var server = http.Server(app);
io = io(server);

var game = require('./libs/game');
app.set('view engine','jade');
app.set('views', path.join(__dirname,'./views'));

app.get('/', function( req, resp ){
  resp.render('index');
});

function get_rooms() {
  return JSON.stringify(io.sockets.adapter.rooms);
}
io.on('connection',function( socket ) {
  console.log( socket.id , 'connect' );
  socket.join('test_room',function() {
    socket.emit('get_rooms',get_rooms());
  });
});

server.listen(8027)