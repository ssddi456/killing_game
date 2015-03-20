var random_chinese_name = require('../libs/random_chinese_name');

random_chinese_name(function(err, name ) {
  console.log( err, name );
})