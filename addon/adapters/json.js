/**
 * @module adapters
 *
 */
import { isEmpty } from '@ember/utils';
import { dasherize } from '@ember/string';
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
	coalesceFindRequests: true,

	pathForType(type) {
		return dasherize(type);
	},

	version: 1,
	debug: false,

	ajaxOptions() {
		const hash = this._super(...arguments);

		// split the params from the url
		const [url, params] = hash.url.split('?');

		// add url parms like version or debug
		hash.url = this.addUrlParams(url);

		// put the params back on the url string but first check
		// to see if the start `?` query params symbol is already there.
		if (!isEmpty(params)) {
			if (!/\?/.test(hash.url)) {
				hash.url = hash.url + '?' + params;
			} else {
				hash.url = hash.url + '&' + params;
			}
		}

		let data = hash.data || {};
		if (typeof data === 'string') {
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
