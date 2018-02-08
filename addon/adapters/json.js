/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import EmberPromise, { reject } from 'rsvp';
import { run, later } from '@ember/runloop';
import { isNone, isEmpty } from '@ember/utils';
import { isArray } from '@ember/array';
import { merge } from '@ember/polyfills';
import { get, set, getWithDefault } from '@ember/object';
import { dasherize } from '@ember/string';
import ErrorUtil from '@busy-web/data/utils/error';
import QueryUtil from '@busy-web/data/utils/query';

/**
 * @class
 * main ember-data adapter
 *
 * @extends DS.JSONAPIAdapter
 */
export default DS.JSONAPIAdapter.extend({
	/**
	 * sets the authorizer to use.
	 *
	 * This must be set to an authorizer in the main
	 * application. like `authorizer:application` that
	 * can extend `@busy-web/data/authorizers/base`
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

	urlForRequest(params) {
		let url = this._super(params);
		let type = this.methodForRequest(params);
		return this._addUrlParams(url, type);
	},

	normalizeErrorResponse(status, headers, payload) {
		const title = `Api Error: ${headers.method} - ${headers.url}`;
    if (payload && typeof payload === 'object') {
			return ErrorUtil.parseAdapterErrors(title, status, get(payload, 'code'), get(payload, 'debug.errors'));
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
			if (!isEmpty(get(err, 'errors'))) {
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
			return reject(err);
		});
	},

	_waitPromise(time=1) {
		return new EmberPromise(resolve => {
			later(() => {
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
		params = QueryUtil.parse(params);
		this.addUrlParams(params, type);
		url =	host + '?' + QueryUtil.stringify(params);
		return url;
	}
});
