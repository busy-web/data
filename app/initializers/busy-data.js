/**
 * @module app/initializers
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
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

		DS.Model.reopen(
		{
			getRecord: function()
			{
				// fix for the model._internalModel issue.
				return this._internalModel.getRecord();
			},

			saveBatch: function(auto)
			{
				this._batch = true;
				this._autoBatch = auto === true ? true : false;
				return this.save();
			},
		});
	}
};
