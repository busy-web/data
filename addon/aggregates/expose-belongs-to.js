/**
 * @module Aggregates
 *
 */
import Ember from 'ember';

/***/
const { get, computed, isEmpty } = Ember;

/***
 * Allows the AggregateRecord to expose the belongs-to record from the model
 *
 * @method exposeBelongsTo
 * @params name {string}
 * @return {Ember.computed}
 */
export default function exposeBelongsTo(name) {
	let meta = {
		name,
		isBelongsTo: true
	};

	let listener = computed({
		get(key) {
			let prop = !isEmpty(name) ? name : key;

			if (isEmpty(meta.name)) {
				meta.name = prop;
			}

			prop = `model.${prop}`;

			if (isEmpty(listener._dependentKeys)) {
				listener._dependentKeys = [prop];
			}

			return get(this, prop);
		}
	});

	listener.meta(meta);

	if (!listener._dependentKeys && !isEmpty(name)) {
		listener._dependentKeys = [name];
	}

	return listener;
}
