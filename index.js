/* jshint node: true */
'use strict';

var _config = require('./config/environment')();

module.exports = {
	name: 'busy-data',

	config(/*env, config*/) {
		return _config;
	},

	included(app) {
    this._super.included(app);

		// see: https://github.com/ember-cli/ember-cli/issues/3718
		while (typeof app.import !== 'function' && app.app) {
			app = app.app;
		}

		this.app = app;

		app.import(app.bowerDirectory + '/node-uuid/uuid.js');
	}
};
