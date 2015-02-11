var storage = module.exports;

var crypto = require('crypto');

var salt = 'killing_game';

storage.create_token = function( key ) {
  var shasum = crypto.createHash('md5');
  shasum.update( salt + key + salt );
  return shasum.digest('hex');
};