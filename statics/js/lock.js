define([

],function(

){
  
  function sync_lock () {
    var locked = false;
    var ret = function( handle, self ) {
      return function (){
        if( locked ){ return; }
        return handle.apply( self, arguments);
      }
    };
    ret.unlock = function() {
      locked = false;
    };
    ret.lock = function() {
      locked = true;
    };
    return ret;
  }
  return sync_lock
});