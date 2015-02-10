var util = require('util');

function Tag ( tagname ) {
  this.name = tagname || '';
  this.living = 0;
  this.expire = Infinity;
};

util._extend(Tag.prototype,{
  toString : function() {
    return this.name;
  },
  is_dead : function() {
    return this.expire <= this.living;
  },
  by_turn : function( n ) {
    this.living += n || 1;
  }
});

module.exports = Tag;