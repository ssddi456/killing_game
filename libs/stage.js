var util = require('util');
var _ = require('lodash');
var async = require('async');

function Stage () {
  this.state             = '';
  this.can_active_in     = [];
  this.can_not_active_in = [];
  this.actors            = [];
}

util._extend(Stage.prototype,{
  add_actors : function( actors ) {
    var self = this;
    actors.forEach(function( actor ) {
      if( _.intersection( actor.tags, self.can_not_active_in ).length ){

      } else if( _.intersection( actor.tags, self.can_actives_in ) ){
        self.actors.push( actor );
      }
    });
  },
  act : function( turn, done ) {
    var self = this;
    async.seriel(this.actors,function( actor, done ) {
      actor.act( turn , self, done );
    }, done );
  }
});

module.exports= Stage;