/*jshint node:true*/
'use strict';

module.exports = function(/* environment, appConfig */) {
  return { 
	'ember-simple-auth': {
		'store': 'session-store:local-store',
		'crossOriginWhitelist': ['*']
	}
  };
};
