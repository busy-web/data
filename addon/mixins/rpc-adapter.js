/**
 * @module Mixins
 */
import { isArray, A } from '@ember/array';
import Mixin from '@ember/object/mixin';

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
		const url = this.buildURL(type.proto()._clientName, null, null, 'query', query);
		if (this.sortQueryParams) {
			query = this.sortQueryParams(query);
		}

		const method = type.proto()._methodName;

		const hash = {
			method,
			params: query,
			id: 1,
			jsonrpc: '2.0'
		};

		return this.ajax(url, 'GET', { disableBatch: true, data: JSON.stringify(hash) }).then(data => {
			data = data.result;
			if(!isArray(data.data)) {
				data.data = A([data.data]);
			}
			return data;
		});
	}
});
