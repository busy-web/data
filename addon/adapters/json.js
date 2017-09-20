/**
 * @module adapters
 *
 */
import RSVP from 'rsvp';
import Ember from 'ember';
import DS from 'ember-data';

import { isNone } from '@ember/utils';
import { isArray } from '@ember/array';
import { merge } from '@ember/polyfills';
import { run } from '@ember/runloop';
import { getWithDefault, set, get } from '@ember/object';

import DataAdapterMixin from '@busybusy/data/mixins/simple-auth-data-adapter';
import BusyError from '@busybusy/data/utils/error';
import Query from '@busybusy/data/utils/query';

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
		return Ember.String.dasherize(type);
	},

	version: 1,
	debug: false,

	urlForRequest(params) {
		let url = this._super(params);
		let type = this.methodForRequest(params);
		return this._addUrlParams(url, type);
	},

	normalizeErrorResponse(status, headers, payload) {
		const title = `Api Error: ${headers.method} - ${headers.url}`;
    if (payload && typeof payload === 'object') {
			return BusyError.parseAdapterErrors(title, status, get(payload, 'code'), get(payload, 'debug.errors'));
    } else {
      return [
        {
          title,
          status: `${status}`,
          detail: `${payload}`
        }
      ];
    }
  },

	handleResponse(status, headers, payload, requestData) {
		headers = typeof headers === 'object' && headers ? headers : {};
		set(headers, 'method', get(requestData, 'method'));
		set(headers, 'url', get(requestData, 'url'));

		return this._super(status, headers, payload, requestData);
	},

	_requestFor(params) {
		const request = this._super(params);
		request.requestType = params.requestType;
		return request;
	},

	_requestToJQueryAjaxHash(request) {
		const hash = this._super({ url: request.url, method: "GET", headers: request.headers, data: request.data }) || {};
		set(hash, 'type', get(request, 'method'));
		set(hash, 'data', getWithDefault(hash, 'data', {}));

		if (!isNone(get(hash, 'data.filter'))) {
			this.changeFilter(get(hash, 'data'));
		}

		this.addDefaultParams(get(hash, 'data'), get(hash, 'type'));

		return hash;
	},

	methodForRequest(params) {
		let { requestType } = params;

		switch (requestType) {
			case 'createRecord': return 'POST';
			case 'updateRecord': return 'PATCH';
			case 'deleteRecord': return 'DELETE';
		}

		return 'GET';
	},

	_hasCustomizedAjax() {
		if (Ember.FEATURES.isEnabled('ds-improved-ajax')) {
			return false;
		} else {
			this._super(...arguments);
		}
	},

	changeFilter(data) {
		const __filter = get(data, 'filter');
		if (!isNone(__filter)) {
			const filter = {};
			Object.keys(__filter).forEach(key => {
				set(filter, key, get(__filter, key).split(','));
			});
			delete data.filter;
			set(data, getWithDefault(this, 'hasManyFilterKey', 'filter'), filter);
		}
	},

	_makeRequest(request, tries=0) {
		const _req = merge({}, request);
		return this._super(_req).catch(err => {
			if (!isNone(get(err, 'errors'))) {
				let error = get(err, 'errors');
				error = isArray(error) ? error[0] : error;

				let status = parseInt(get(error, 'status'), 10);
				if (status === 429 && tries < 5) {
					return this._waitPromise(300).then(() => {
						return this._makeRequest(request, tries+1);
					});
				} else if (status === 500 && tries < 5) {
					let detail = get(error, 'detail');
					if (/failed to obtain lock with key/.test(detail)) {
						return this._waitPromise(500).then(() => {
							return this._makeRequest(request, tries+1);
						});
					}
				}
			}
			return RSVP.reject(err);
		});
	},

	_waitPromise(time=1) {
		return new RSVP.Promise(resolve => {
			run.later(() => {
				run(null, resolve, null);
			}, time);
		});
	},

	ajaxOptions(url, type, options) {
		let _type = type === 'PUT' ? 'PATCH' : type;

		// set url params
		url = this._addUrlParams(url, _type);

		// make sure options is properly formatted
		options = options || {};
		set(options, 'data', getWithDefault(options, 'data', {}));

		// check for a data filter
		if (!isNone(get(options, 'data.filter'))) {
			this.changeFilter(options.data);
		}

		// add default params
		this.addDefaultParams(options.data, _type);

		// cal super to get the ajax hash
		const hash = this._super(url, type, options);

		// set the new hash type
		set(hash, 'type', _type);

		// if hash is post then adjust the data for bad apis
		if (get(hash, 'contentType') !== false && (get(hash, 'type') === 'POST' || get(hash, 'type') === 'PATCH')) {
			set(hash, 'contentType', 'application/x-www-form-urlencoded; charset=UTF-8');
      set(hash, 'data', JSON.parse(get(hash, 'data') || {}));
		}

		// return the hash
		return hash;
	},

	/**
	 * passes the data object for addition default params
	 * to be added
	 *
	 * @method addDefaultParams
	 * @params data {object} add params to object
	 * @returns {void}
	 */
	addDefaultParams() { },

	/**
	 * passes url params object for additional default url params
	 * to be added
	 *
	 * @method addUrlParams
	 * @params params {object} add params to object
	 * @returns {void}
	 */
	addUrlParams() {},

	_addUrlParams(url, type) {
		let [ host, params ] = url.split('?');
		params = Query.parse(params);
		this.addUrlParams(params, type);
		url =	host + '?' + Query.stringify(params);
		return url;
	}
});
