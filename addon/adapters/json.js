/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';
import RPCAdapterMixin from 'busy-data/mixins/rpc-adapter-mixin';
//import Configuration from './../configuration';
//import assert from 'busy-utils/assert';

/**
 * @class
 * main ember-data adapter
 *
 * @extends DS.JSONAPIAdapter
 */
export default DS.JSONAPIAdapter.extend(DataAdapterMixin, RPCAdapterMixin, {
	/**
	 * sets the authorizer to use.
	 *
	 * This must be set to an authorizer in the main
	 * application. like `authorizer:application` that
	 * can extend `busy-data/authorizers/base`
	 *
	 * @property authorizer
	 * @type string
	 */
	authorizer: 'authorizer:base',

	pathForType(type) {
		return Ember.String.dasherize(type);
	},

	ajaxOptions(/*url, type, options*/) {
		const hash = this._super(...arguments);

		let data = hash.data;
		let isString = false;
		if(typeof data === 'string') {
			isString = true;
			data = JSON.parse(data);
		}

		if (!data.jsonrpc) {
			this.addDefaultParams(data);
			hash.data = data;
		} else {
			hash.type = "POST";
			hash.dataType = "json";
		}

		return hash;
	},

	addDefaultParams(/*query*/) {
		return;
	}
});
