/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import DataAdapterMixin from 'busy-data/mixins/simple-auth-data-adapter';
import _error from 'busy-data/utils/error';

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

		// split the params from the url
		const [ host, query] = url.split('?');

		// add url parms like version or debug
		url = this.addUrlParams(host);

		// put the params back on the url string but first check
		// to see if the start `?` query params symbol is already there.
		if (!Ember.isEmpty(query)) {
			if (!/\?/.test(url)) {
				url = url + '?' + query;
			} else {
				url = url + '&' + query;
			}
		}

		return url;
	},

	handleResponse(status, headers, payload, requestData) {
		if (!requestData.isBatch) {
			payload.__type = "JSONAPIAdapter";
		}

		if (status === 429) {
			payload.errors = _error.normalizeAdapterError('BATCH API', status, 429, 'Api rate limit reached');
			let errors = this.normalizeErrorResponse(status, headers, payload);
			let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);
			return new DS.AdapterError(errors, detailedMessage);
		}

		return this._super(status, headers, payload, requestData);
	},

	payloadCodes(payload) {
		return Ember.get(payload, 'code');
	},

	payloadDetails(payload) {
		return Ember.get(payload, 'details');
	},

	parseErrors(payload, status) {
		payload.errors = _error.parseAdapterErrors(payload.__type, status, this.payloadCodes(payload), this.payloadDetails(payload));
	},

	_requestToJQueryAjaxHash(request) {
		const hash = this._super({ url: request.url, method: "GET", headers: request.headers, data: request.data }) || {};
		hash.type = request.method;
		hash.data = hash.data || {};

		if (hash.data && hash.data.filter) {
			this.changeFilter(hash);
		}

		this.addDefaultParams(hash);

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
		return false;
	},

	addDefaultParams(/*hash*/) {
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
	},

	_makeRequest(request) {
		const _req = Ember.merge({}, request);
		return this._super(_req).catch(err => {
			if (err.errors && err.errors.status === 429) {
				return this._waitPromise(300).then(() => {
					return this._makeRequest(request);
				});
			} else {
				return Ember.RSVP.reject(err);
			}
		});
	},

	_waitPromise(time=1) {
		return new Ember.RSVP.Promise(resolve => {
			Ember.run.later(() => {
				Ember.run(null, resolve, null);
			}, time);
		});
	},
});
