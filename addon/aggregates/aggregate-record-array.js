/**
 * @module Aggregates
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import { Assert } from 'busy-utils';

/***/
const { RecordArray } = DS;
const { get, isNone, computed } = Ember;
const computedAlias = computed.alias;

function callType(target, name, args) {
	Assert.isArray(target);
	Assert.isString(name);

	let recordArray = get(target, '__recordArray');
	let method = get(target, `__recordArray.${name}`);

	Assert.test(`${name}() can only be called on a AggregateRecordArray when it was created using a RecordArray type, not when using Array type`, !isNone(method));

	return method.apply(recordArray, args);
}

function methodAlias(name) {
	return function(...args) {
		return callType(this, name, args);
	}
}


/**
 * Wrapper class for generating aggregate data on a set of models
 *
 *
 * @class AggregateRecordArray
 * @extends DS.RecordArray
 */
const AggregateRecordArray = RecordArray.extend({
	isLoaded: computedAlias('__recordArray.isLoaded'),
	isUpdating: computedAlias('__recordArray.isUpdating'),
	manager: computedAlias('__recordArray.manager'),
	meta: computedAlias('__recordArray.meta'),
	query: computedAlias('__recordArray.query'),
	links: computedAlias('__recordArray.links'),
	_updatingPromise: computedAlias('__recordArray._updatingPromise'),

	save: methodAlias('save'),
	update: methodAlias('update'),
	on: methodAlias('on'),
	trigger: methodAlias('trigger'),
	replace: methodAlias('replace'),

	/**
	 * Overrides standard sortBy to make it return this, instead
	 * of returning a new array that is no longer an AggregateRecordArray.
	 *
	 * @public
	 * @method sortBy
	 * @extends RecordArray.sortBy
	 * @returns {AggregateRecordArray}
	 */
	sortBy(...args) {
		let sorted = this._super(...args);
		this.set('content', sorted);
		return this;
	}
});

export default AggregateRecordArray;
