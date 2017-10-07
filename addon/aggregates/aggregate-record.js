/**
 * @module Aggregates
 *
 */
import Ember from 'ember';

/***/
const EmberObject = Ember.Object;

/**
 * wrapper class for generating aggregate data on a model
 *
 * @class AggregateRecord
 * @extends Ember.Object
 */
const AggregateRecord = EmberObject.extend({
	model: null,

	id: null,

	modelName: null,
	predecessor: null,

	getRecord() {
		return this;
	},

	getModel() {
		return this.get('model');
	}
});

export default AggregateRecord;
