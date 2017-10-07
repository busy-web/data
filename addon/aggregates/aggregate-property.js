/**
 * @module Aggregates
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

/***/
const { computed, merge } = Ember;

/**
 * Private method for creating a computed property for a specific
 * type of computed property and adding the meta for describing
 * it as a aggregateProperty
 *
 * @private
 * @method createComputedByType
 */
function createComputedByType(computedMethod, args) {
	let listener = computedMethod(...args);
	function meta(options={}) {
		Assert.isObject(options);

		let meta = merge(this._meta || {}, options);
		return this.__meta(meta);
	}

	listener.__meta = listener.meta;
	listener.meta = meta;

	listener.meta({ isAggregate: true });
	return listener;
}

/**
 * Creates a computed property with special meta tags
 * to notify the AggregateRecordArray of any properties on
 * the AggregateRecord that need to be aggregated.
 *
 * aggregate properties must be type Number
 *
 * @public
 * @method aggregateProperty
 * @params ...args {argumets} Ember.computed params
 * @return {Ember.computed}
 */
function aggregateProperty(...args) {
	return createComputedByType(computed, args);
}

// overrides for computedProperty
//aggregateProperty.alias = ((...args) => createComputedByType(computed.alias, args))
//aggregateProperty.and = ((...args) => createComputedByType(computed.and, args))
//aggregateProperty.bool = ((...args) => createComputedByType(computed.bool, args))
//aggregateProperty.collect = ((...args) => createComputedByType(computed.collect, args))
//aggregateProperty.deprecatingAlias = ((...args) => createComputedByType(computed.deprecatingAlias, args))
//aggregateProperty.empty = ((...args) => createComputedByType(computed.empty, args))
//aggregateProperty.equal = ((...args) => createComputedByType(computed.equal, args))
//aggregateProperty.filter = ((...args) => createComputedByType(computed.filter, args))
//aggregateProperty.filterBy = ((...args) => createComputedByType(computed.filterBy, args))
//aggregateProperty.gt = ((...args) => createComputedByType(computed.gt, args))
//aggregateProperty.gte = ((...args) => createComputedByType(computed.gte, args))
//aggregateProperty.intersect = ((...args) => createComputedByType(computed.intersect, args))
//aggregateProperty.lt = ((...args) => createComputedByType(computed.lt, args))
//aggregateProperty.lte = ((...args) => createComputedByType(computed.lte, args))
//aggregateProperty.map = ((...args) => createComputedByType(computed.map, args))
//aggregateProperty.mapBy = ((...args) => createComputedByType(computed.mapBy, args))
//aggregateProperty.match = ((...args) => createComputedByType(computed.match, args))
//aggregateProperty.max = ((...args) => createComputedByType(computed.max, args))
//aggregateProperty.min = ((...args) => createComputedByType(computed.min, args))
//aggregateProperty.none = ((...args) => createComputedByType(computed.none, args))
//aggregateProperty.not = ((...args) => createComputedByType(computed.not, args))
//aggregateProperty.notEmpty = ((...args) => createComputedByType(computed.notEmpty, args))
//aggregateProperty.oneWay = ((...args) => createComputedByType(computed.oneWay, args))
//aggregateProperty.or = ((...args) => createComputedByType(computed.or, args))
//aggregateProperty.readOnly = ((...args) => createComputedByType(computed.readOnly, args));
//aggregateProperty.reads = ((...args) => createComputedByType(computed.reads, args))
//aggregateProperty.setDiff = ((...args) => createComputedByType(computed.setDiff, args))
//aggregateProperty.sort = ((...args) => createComputedByType(computed.sort, args))
//aggregateProperty.sum = ((...args) => createComputedByType(computed.sum, args))
//aggregateProperty.union = ((...args) => createComputedByType(computed.union, args))
//aggregateProperty.uniq = ((...args) => createComputedByType(computed.uniq, args))
//aggregateProperty.uniqBy = ((...args) => createComputedByType(computed.uniqBy, args))

export default aggregateProperty;
