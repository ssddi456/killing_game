module.exports = function( arr ) {
  var ret = [];
  for(var len = arr.length, i = 0, n;
      i<len;
      i++){
    n = Math.floor(Math.random()*(len-i));
    ret.push(arr.splice(n,1)[0]);
  }
  return ret;
}