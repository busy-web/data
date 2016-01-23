/**
 * @module app/initializers
 *
 */
import Ember from 'ember';
import ENV from '../config/environment';
import Configuration from 'busy-data/configuration';

export default {
	name: 'busy-data',

	initialize: function(registry)
	{
		const config = ENV['busy-data'] || {};
			  config.baseURL = ENV.baseURL;

		// load busy-data config options
		Configuration.load(config);

		conole.log('busy-data initializer', config, registry);
	}
};
