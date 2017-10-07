/**
 * @module Aggregates
 *
 */
import Ember from 'ember';
import createAggregateArray from './create-aggregate-array';

/***/
const { get, computed, isEmpty, isNone } = Ember;

/***
 * Allows the AggregateRecord to expose the has-many array from the model
 *
 * @method exposeHasMany
 * @params name {string}
 * @params options {object}
 * @return {Ember.computed}
 */
export default function exposeHasMany(name, options) {
	if (!isNone(name) && typeof name === 'object') {
		options = name;
		name = undefined;
	}

	options = options || {};

	let startBoundsKey = get(options, 'startBoundsKey');
	let endBoundsKey = get(options, 'endBoundsKey');

	let meta = {
		name,
		options,
		isHasMany: true
	};

	let listener = computed({
		get(key) {
			let prop = !isEmpty(name) ? name : key;

			if (isEmpty(meta.name)) {
				meta.name = prop;
			}

			prop = `model.${prop}`;

			if (isEmpty(listener._dependentKeys)) {
				listener._dependentKeys = [`${prop}.[]`];
			}

			let options = {};
			if (!isEmpty(startBoundsKey)) {
				options.startBounds = get(this, startBoundsKey);
			}

			if (!isEmpty(endBoundsKey)) {
				options.endBounds = get(this, endBoundsKey);
			}

			let value = get(this, prop);
			if (isNone(value)) {
				value = [];
			}

			return createAggregateArray(this.store, value, options);
		}
	});

	listener.meta(meta);

	if (!listener._dependentKeys && !isEmpty(name)) {
		listener._dependentKeys = [name];
	}

	return listener;
}
