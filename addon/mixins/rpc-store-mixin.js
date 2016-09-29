/**
 * @module Mixins
 *
 */
import Ember from 'ember';
import RPCAdapter from 'busy-data/adapters/rpc-adapter';

/***/
const { getOwner } = Ember;

/**
 * `BusyData/Mixins/RpcStoreMixin`
 *
 */
export default Ember.Mixin.create({
	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 */
	rpcRequest(type, method, params, baseURL) {
		const client = RPCAdapter.create(getOwner(this).ownerInjection(), {url: type});
		if (baseURL !== undefined) {
			client.set('baseURL', baseURL);
		}
		return client.call(method, params);
	}
});
