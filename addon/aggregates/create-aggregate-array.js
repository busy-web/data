/**
 * @module Aggregates
 *
 */
import Ember from 'ember';
import createAggregateRecord from './create-aggregate-record';
import AggregateRecordArray from './aggregate-record-array';
import { Assert } from 'busy-utils';

/***/
const { getOwner, computed, A, get, set, merge, isNone } = Ember;

/**
 * Helper method to add computed properties to an extended version
 * of the AggregateRecordArray
 *
 * @private
 * @method aggregateTotals
 */
function aggregateTotals(recordArray, record) {
	// create a new computed property for all
	// aggregateProperty objects on the AggregateRecord
	Object.keys(record.__proto__).forEach(key => {
		let attr = record[key];

		// make sure the attr is not null or undefined and that
		// it is @type {Object}
		if (!isNone(attr) && typeof attr === 'object') {

			// make sure the computed property is an aggregateProperty
			// and the AggregateRecordArray does not already have it
			// defined
			if (get(attr, '_meta.isAggregate') && !recordArray.proto()[key]) {

				// define the new computed property for the AggregateRecordArray
				recordArray.reopen({
					[key]: computed(`content.@each.${key}`, function() {
						return this.get('content').mapBy(key).reduce((a, b) => a + b, 0);
					})
				});
			}
		}
	});
}

/**
 * Creates an aggregate record array for the specific models
 *
 * @method createAggregateArray
 * @params models {DS.RecordArray}
 * @return {AggregateRecordArray}
 */
export default function createAggregateArray(store, models=[], options={}) {
	Assert.isArray(models);
	Assert.isObject(options);

	// if the models is a RecordArray then call toArray
	// so createAggregateArray is always working with a regular array
	let _models = models;
	if (models.toArray) {
		_models = models.toArray();
	}

	// create a new AggregateRecordArray extension for this set of AggregateRecords
	let AggregateArray = AggregateRecordArray.extend();
	let aggs = A();

	let predecessor;
	_models.forEach(model => {
		let aggregateRecord = createAggregateRecord(store, model, merge({ predecessor }, options));

		// adds a computed property that will total up all AggregateRecord properites
		// for this AggregateRecordArray
		aggregateTotals(AggregateArray, aggregateRecord);

		// add the aggregateRecord to the aggregateArray
		aggs.pushObject(aggregateRecord);

		// save the aggregateRecord as the predecessor
		predecessor = aggregateRecord;
	});

	let owner = getOwner(store);

	// create a new AggregateRecordArray from the extended AggregateRecordArray
	// generated for the set of AggregateRecords
	let aggregateArray = AggregateArray.create(owner.ownerInjection(), { content: aggs });
	set(aggregateArray, '__recordArray', models);

	return aggregateArray;
}
