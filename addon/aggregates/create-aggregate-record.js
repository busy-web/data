/**
 * @module Aggregates
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

/***/
const { getOwner, merge } = Ember;

/**
 * Creates an aggregate record array for the specific models
 *
 * @method createAggregateArray
 * @params models {DS.RecordArray}
 * @return {AggregateRecordArray}
 */
export default function createAggregateRecord(store, model, options={}) {
	Assert.isObject(model);
	Assert.isObject(options);

	let id = model.id;
	let type = model._internalModel.modelName;
	let owner = getOwner(store);

	let _class = owner.factoryFor(`aggregate:${type}`);
	if (!_class) {
		_class = owner.factoryFor(`aggregate:lib/aggregate-record`);
	}

	let props = merge({ id, store, model, modelName: type }, options);
	return _class.create(props);
}
