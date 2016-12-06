/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

/**
 * @class
 * main ember-data adapter
 *
 * @extends DS.JSONAPIAdapter
 */
export default DS.JSONAPIAdapter.extend(DataAdapterMixin, {
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
	hasManyFilterKey: 'filter',
	coalesceFindRequests: false,

	pathForType(type) {
		return Ember.String.dasherize(type);
	},

	version: 1,
	debug: false,

	ajaxOptions(/*url, type, options*/) {
		const hash = this._super(...arguments);

		let data = hash.data;
		let isString = false;
		if (typeof data === 'string') {
			isString = true;
			data = JSON.parse(data);
		}

		if (hash.data && hash.data.filter) {
			this.changeFilter(hash);
		}

		if (hash.contentType !== false) {
			delete hash.contentType;
		}

		if (!data.jsonrpc) {
			if (hash.type === 'GET' && hash.isUpload !== true) {
				this.addDefaultParams(data);
			}
			hash.data = data;
		} else {
      //hash.contentType = 'application/json; charset=utf-8';
			hash.type = "POST";
			hash.dataType = "json";
		}

		return hash;
	},

	addDefaultParams(/*query*/) {
		return;
	},

	changeFilter(hash) {
		const filterKey = this.get('hasManyFilterKey');
		hash.data[filterKey] = {};
		for (let i in hash.data.filter) {
			if (hash.data.filter.hasOwnProperty(i)) {
				hash.data[filterKey][i] = hash.data.filter[i].split(',');
			}
		}
		delete hash.data.filter;
	}
});
