/**
 * @module utils
 *
 */
import Ember from 'ember';
import Assert from 'busy-utils/assert';

/**
 * Model join computed property
 *
 */
export default function join(type, key) {
	Assert.funcNumArgs(arguments, 2);
	Assert.isString(type);
	if (!Ember.isNone(key)) {
	 	Assert.isString(key);
	}

  return Ember.computed(function() {
		// get this model name
		const modelName = this.toString().replace(/^[^:]*:([^:]*):[\s\S]*/, '$1');

		// key is optional, if no key is provided
		// the type will be used as type + id
		if (Ember.isNone(key)) {
			key = type.camelize() + 'Id';
		}

		// underscore the key for the api.
		key = key.underscore();

		const data = Ember.ObjectProxy.extend({
			content: null,
			method: 'join',
			modelType: type,
			join: modelName,
			joinOn: key,
			_isJoin: true
		});

		// return the join object with all the data
		return data.create();
	});
}
