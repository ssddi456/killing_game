var request = require('request');
var cheerio = require('cheerio');
var tar = 'http://www.qmsjmfb.com/';

module.exports = function( done ) {
  request.post(
    tar,
    {
      form : {
        surname : 'rand',
        xing    : '天纵',
        sex     : 'all',
        num     : '1'
      }
    },
    function( err, resp, body) {
      done(err, err || cheerio.load(body)('#cn > div.name_box > ul > li:nth-child(1)').text());
    });
}
