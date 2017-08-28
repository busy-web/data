/**
 * @module Mixins
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

/**
 * `BusyData/Mixins/RpcAdapter`
 *
 * @class RpcAdapter
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({
	/**
	 * Override for query to redirect rcp queries
	 *
	 * @private
	 * @method query
	 */
	query(store, type, query) {
		if (type.proto()._isRPC) {
			return this.queryRPC(store, type, query);
		} else {
			return this._super(...arguments);
		}
	},

	/**
	 * Makes a query to an rpc api model
	 *
	 * @public
	 * @method queryRPC
	 * @param store {DS.Store}
	 * @param type {DS.ModelType}
	 * @param query {object}
	 * @return {Ember.RSVP.Promise}
	 */
	queryRPC(store, type, query) {
		Assert.funcNumArgs(arguments, 3, true);
		Assert.isObject(query);

		if (this.sortQueryParams) {
			query = this.sortQueryParams(query);
		}

		//return this.ajax(url, 'GET', { disableBatch: true, data: JSON.stringify(hash) }).then(data => {
		const request = this._requestFor({ store, type, query, requestType: 'query', _requestType: 'rpc'});
		return this._makeRequest(request).then(data => {
			if(!Ember.isArray(data.data)) {
				data.data = Ember.A([data.data]);
			}
			return data;
		});
	},

	dataForRequest(params) {
		if (params._requestType === 'rpc') {
			const method = params.type.proto()._methodName;
			Assert.test('The rpc model has no _methodName to call.', !Ember.isNone(method));
			return {
				method,
				params: params.query,
				id: 1,
				jsonrpc: '2.0'
			};
		}
		return this._super(params);
	},

	headersForRequest(params) {
		const headers = this._super(params);
		if (params._requestType === 'rpc') {
			headers.Accept = 'application/json; charset=utf-8';
		}
		return headers;
	},

	methodForRequest(params) {
		if (params._requestType === 'rpc') {
			return "POST";
		}
		return this._super(params);
	},

	urlForRequest(params) {
		let url = this._super(params);
		if (params._requestType === 'rpc') {
			const regx = new RegExp(params.type.modelName);
			url = url.replace(regx, params.type.proto()._clientName);
		}
		return url;
	},

	_requestFor(params) {
		const res = this._super(params);
		if (params._requestType === 'rpc') {
			res._requestType = 'rpc';
		}
		return res;
	},

	_requestToJQueryAjaxHash(params) {
		let hash = this._super(...arguments) || {};

		if (params._requestType === 'rpc') {
			hash.contentType = 'application/json; charset=utf-8';
			hash.dataType = "json";
			hash.disableBatch = true;
		}

		return hash;
	}
});
