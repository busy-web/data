/**
 * @module utils
 *
 */
import Ember from 'ember';

export default Ember.ObjectProxy.extend({
	unknownProperty(key) {
		let result = this._super(...arguments);
		const getter = this[`${key}Getter`];
		if (typeof getter === 'function') {
			result = getter.call(this, result);
		}
		return result;
	}
});
