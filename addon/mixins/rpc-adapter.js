/**
 * @module Mixins
 */
import { isArray, A } from '@ember/array';
import Mixin from '@ember/object/mixin';
import { isNone, isEmpty } from '@ember/utils';
import EmberObject, { get } from '@ember/object';
import Ember from 'ember';
import { Assert } from 'busy-utils';

/**
 * `BusyData/Mixins/RpcAdapter`
 *
 * @class RpcAdapter
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Mixin.create({
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
			return this._super(...arguments).then(data => {
				if(!isArray(data.data)) {
					data.data = A([data.data]);
				}
				return data;
			});
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

		let promise;
		if (Ember.FEATURES.isEnabled('ds-improved-ajax')) {
			const request = this._requestFor({ store, type, query, requestType: 'query', _requestType: 'rpc'});
			promise = this._makeRequest(request);
		} else {
			let _requestType = 'rpc'
      let url = this.buildURL(type.proto()._clientName, null, null, 'query', query);

			query = this.dataForRequest({ type, _requestType, query });

      if (this.sortQueryParams) {
        query = this.sortQueryParams(query);
      }

      promise = this.ajax(url, 'POST', { _requestType, data: query });
		}

		return promise;
	},

	rpcRequest(store, modelName, method, query={}, host) {
		Assert.funcNumArgs(arguments, 5);
		Assert.isString(modelName);
		Assert.isString(method);
		Assert.isObject(query);

		const type = EmberObject.extend({
			_methodName: method,
			_clientName: modelName,
			_hostName: host
		}).reopenClass({ modelName });

		return this.queryRPC(store, type, query);
	},

	ajaxOptions(url, type, options) {
		const isRPC = get(options || {}, '_requestType') === 'rpc';
		const hash = this._super(...arguments);

		if (isRPC) {
			hash.data = JSON.stringify(hash.data);
      hash.contentType = 'application/json; charset=utf-8';
			hash.disableBatch = true;
		}

		return hash;
	},

	dataForRequest(params) {
		if (params._requestType === 'rpc') {
			const method = params.type.proto()._methodName;
			Assert.test('The rpc model has no _methodName to call.', !isNone(method));
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
			const client = params.type.proto()._clientName;
			if (params.type.modelName !== client) {
				const regx = new RegExp(params.type.modelName);
				url = url.replace(regx, client);
			}

			const host = params.type.proto()._hostName;
			if (!isEmpty(host) && get(this, 'host') !== host) {
				const regx = new RegExp(get(this, 'host'));
				url = url.replace(regx, host);
			}
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

	_requestToJQueryAjaxHash(request) {
		let hash = this._super(request) || {};

		if (request._requestType === 'rpc') {
      hash.contentType = 'application/json; charset=utf-8';
      hash.data = JSON.stringify(request.data);
			hash.dataType = "json";
			hash.disableBatch = true;
		}

		return hash;
	},

  handleResponse(status, headers, payload, requestData) {
		if (payload && typeof payload === 'object' && get(payload, 'jsonrpc')) {
			payload = get(payload, 'result');
		}
		return this._super(status, headers, payload, requestData);
	}
});
