//
// string_format : {[a-z]:4}
//
//
var string_proto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var string_proto_len = string_proto.length;

var random = {
  randomInt : function( i, k ) {
    if( arguments.length == 1 ){
      return Math.floor( Math.random() * i );
    } 
    return Math.ceil(i) + Math.floor( Math.random() * (k - i) );
  },
  randomArray : function( i, constructor ) {
    var arr = Array(i).join('1').split('1').map(function(){
      return new constructor();
    });
    return arr;
  },
  randomString : function( i, proto ){
    if( !isNaN(parseInt(i,10)) ){
      return Array(i+1).join('1').split('1').map(function(){
        return random.randomItem(proto || string_proto);
      }).join('');
    }
    var r_char_filter_with_repeat = /^(\[.+\])(:(\d+))?$/;
    if( !i.match(/\{[^\}]+\}/) ){
      if( !i.match(r_char_filter_with_repeat) ){
        return random.randomItem( i );
      }
      var coma_idx = i.match(r_char_filter_with_repeat);
      proto = coma_idx[1];     
      var reg = new RegExp(proto,'g');
      proto = string_proto.split('').filter(function( str ) {
        return str.match(reg);
      }).join('');
      var n = parseInt( coma_idx[3] || 1 );
      return random.randomString( n, proto );
    }
    return (i+'').replace( /\{([^\}]+)\}/g, function($, $1 ) {
      return random.randomString($1);
    });
  },
  randomConstructor : function( obj ){
    var ret = function(){
      var v;
      for( var k in obj ){
        v = obj[k];
        if( obj.hasOwnProperty(k) ){
          this[k] = 
            v == '' 
              ? v 
              : typeof v == 'object' 
                ? (!v.slice 
                    ? random.Constructor(v)()
                    : typeof v[0] == 'function' 
                      ? random.randomArray( random.randomInt(v[1]), v[0] )
                      : v[0] == 'fixed' 
                        ? v[1]
                        : random.randomInt( v[0], v[1] ) ) 
                : typeof v == 'function' 
                    ? new v() 
                    : !isNaN( parseInt(v) ) 
                        ? random.randomInt( parseInt(v) + 1) 
                        : random.randomString( v );
        }
      }
    }
    return ret;
  },
  randomItem :function( arr ) {
    return arr[random.randomInt(arr.length)];
  }
}

random.Int = random.randomInt;
random.Array = random.randomArray;
random.String = random.randomString;
random.Constructor = random.randomConstructor;
random.Item = random.randomItem;
define([

],function(

){
  return random;
});