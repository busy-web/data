/**
 * @module app/instance-initializers
 *
 */
import Ember from 'ember';

export default {
	name: 'busy-data',

	initialize: function(instance)
	{
		console.log('busy-data instance-initializer', instance);
	}
};
