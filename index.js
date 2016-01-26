/* jshint node: true */
'use strict';

module.exports = {
	name: 'busy-data',

	config: function(env, config)
	{
		console.log(env, config);
	},

	included: function(app)
	{
		this._super.included(app);

		this.app.import(app.bowerDirectory + '/node-uuid/uuid.js');
	}
};
