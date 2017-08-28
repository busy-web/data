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
		payload.__type = "JSONAPIAdapter";
		if (status === 429) {
			payload.errors = _error.normalizeAdapterError('BATCH API', status, 4291, 'Api rate limit reached');
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

	dataForRequest(params) {
		const data = this._super(params) || {};
		const getters = ['findRecord', 'find', 'findAll', 'findMany', 'findHasMany', 'findBelongsTo', 'query', 'queryRecord', 'queryRPC'];

		if (getters.indexOf(params.requestType) !== -1) {
			this.addDefaultParams(data, params);
		}

		if (data.filter) {
			debugger;
			this.changeFilter(data);
		}

		return data;
	},

	_hasCustomizedAjax() {
		return false;
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
	},


  _stripIDFromURL(store, snapshot) {
		if (snapshot._internalModel.link) {
      const serializer = store.serializerFor(snapshot.modelName);
			const key = snapshot._internalModel.foreignKey;
			const id = snapshot._internalModel.__data[key];
			const regx = new RegExp(`${serializer.keyForAttribute(key)}=${id}`);
			let url = snapshot._internalModel.link;
			url = url.replace(regx, '').replace(/\?&/, '?').replace(/&&/, '&').replace(/\?$/, '');
			return url;
		} else {
			return this._super(store, snapshot);
		}
	}
});
