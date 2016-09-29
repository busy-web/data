/**
 * @module Mixins
 */
import Ember from 'ember';
import assert from 'busy-utils/assert';

/**
 * `BusyData/Mixins/RpcAdapterMixin`
 *
 */
export default Ember.Mixin.create({
	query(store, type, query) {
		if (type.proto()._isRPC) {
			return this.queryRPC(store, type, query);
		} else {
			return this._super(...arguments);
		}
	},

	queryRPC(store, type, query) {
		var url = this.buildURL(type.proto()._clientName, null, null, 'query', query);

		if (this.sortQueryParams) {
			query = this.sortQueryParams(query);
		}

		const method = type.proto()._methodName;
		assert.test('The rpc model has no _methodName to call.', !Ember.isNone(method));

		const hash = {
			method,
			params: query,
			id: 1,
			jsonrpc: '2.0'
		};

		return this.ajax(url, 'GET', { data: JSON.stringify(hash) }).then(data => {
			data = data.result;
			if(!Ember.isArray(data.data)) {
				data.data = Ember.A([data.data]);
			}
			return data;
		});
	}
});
