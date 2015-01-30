var stage = require('./libs/stage');
var actor = require('./libs/actor');

var game = function( actor ) {
    
};
var stages =  [
                'start',
                ['act',
                  [ 'nights',
                    [
                      'call killers',
                      'killers',
                      'call polices',
                      'polices',
                      'call doctors',
                      'doctors'
                    ]
                  ],
                  'check',
                  ['day',
                    [
                      'call new_deads',
                      'new_deads',
                      'call discribe',
                      'discribe',
                      'call votes',
                      'votes',
                      'judgements'
                    ]
                  ],
                  'check'
                ],
                'end'
              ];