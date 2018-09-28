/**
 * @module Mixins
 */
import { isArray, A } from '@ember/array';
import { assert } from '@ember/debug';
import { isNone } from '@ember/utils';
import { get } from '@ember/object';
import Mixin from '@ember/object/mixin';

/**
 * `BusyData/Mixins/RpcAdapter`
 *
 * @class RpcAdapter
 * @namespace BusyData.Mixins
 * @extends Mixin
 */
export default Mixin.create({
	/**
	 * Override for query to redirect rcp queries
	 *
	 * @private
	 * @method query
	 */
	query(store, type, query) {
		if (type.requestType === 'rpc') {
			return this.queryRPC(store, type, query).then(data => {
				if(!isArray(data.data)) {
					data.data = A([data.data]);
				}
				return data;
			});
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
	 * @return {RSVP.Promise}
	 */
	queryRPC(store, type, query) {
    let url = this.buildURL(type.modelName, null, null, 'query', query);

		// url is provided to rpcRequest
		if (type && type.host) {
			const rpcHost = type.host;
			const host = this.host;

			url = url.replace(host, rpcHost);
		}

		// convert query to rpc query object
		query = this.dataForRequest(type, query);

		if (this.sortQueryParams) {
			query = this.sortQueryParams(query);
		}
		return this.ajax(url, 'RPC', { data: query });
	},

	rpcRequest(store, modelName, method, query={}, host) {
		const type = { modelName, method, host, requestType: 'rpc' };
		return this.queryRPC(store, type, query);
	},

	ajaxOptions(url, type, options) {
		if (type === 'RPC') {
			const hash = this._super(url, 'POST', options);

			hash.data = JSON.stringify(hash.data);
      hash.contentType = 'application/json; charset=utf-8';
			hash.disableBatch = true;

			return hash;
		}
		return this._super(url, type, options);
	},

	dataForRequest(type, params) {
		if (type.requestType === 'rpc') {
			assert('The rpc model has no _methodName to call.', !isNone(type.method));

			return {
				method: type.method,
				params: params,
				id: 1,
				jsonrpc: '2.0'
			};
		}
		return this._super(params);
	},

	// headersForRequest(params) {
	//   const headers = this._super(params);
	//   if (params._requestType === 'rpc') {
	//     headers.Accept = 'application/json; charset=utf-8';
	//   }
	//   return headers;
	// },

	// methodForRequest(params) {
	//   if (params._requestType === 'rpc') {
	//     return "POST";
	//   }
	//   return this._super(params);
	// },

	// urlForRequest(params) {
	//   let url = this._super(params);
	//   if (params._requestType === 'rpc') {
	//     const client = params.type.proto()._clientName;
	//     if (params.type.modelName !== client) {
	//       const regx = new RegExp(params.type.modelName);
	//       url = url.replace(regx, client);
	//     }

	//     const host = params.type.proto()._hostName;
	//     if (!isEmpty(host) && get(this, 'host') !== host) {
	//       const regx = new RegExp(get(this, 'host'));
	//       url = url.replace(regx, host);
	//     }
	//   }
	//   return url;
	// },

	// _requestFor(params) {
	//   const res = this._super(params);
	//   if (params._requestType === 'rpc') {
	//     res._requestType = 'rpc';
	//   }
	//   return res;
	// },

	// _requestToJQueryAjaxHash(request) {
	//   let hash = this._super(request) || {};

	//   if (request._requestType === 'rpc') {
  //     hash.contentType = 'application/json; charset=utf-8';
  //     hash.data = JSON.stringify(request.data);
	//     hash.dataType = "json";
	//     hash.disableBatch = true;
	//   }

	//   return hash;
	// },

  handleResponse(status, headers, payload, requestData) {
		if (payload && typeof payload === 'object' && get(payload, 'jsonrpc')) {
			payload = get(payload, 'result');
		}
		return this._super(status, headers, payload, requestData);
	}
});
