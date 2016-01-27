/* jshint node: true */
'use strict';

var _config = require('./config/environment');

module.exports = {
	name: 'busy-data',

	config: function(env, config)
	{
		console.log('env', env);
		console.log('addon ', _config);
		console.log('app', config);

		return _config;
	},

	included: function(app)
	{
		this._super.included(app);

		this.app.import(app.bowerDirectory + '/node-uuid/uuid.js');
	}
};
