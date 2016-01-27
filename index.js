/* jshint node: true */
'use strict';

var _config = require('./config/environment')();

module.exports = {
	name: 'busy-data',

	config: function(/*env, config*/)
	{
		return _config;
	},

	included: function(app)
	{
		this._super.included(app);

		this.app.import(app.bowerDirectory + '/node-uuid/uuid.js');
	}
};
