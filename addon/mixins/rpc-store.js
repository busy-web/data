/**
 * @module Mixins
 *
 */
import Ember from 'ember';
import RPCAdapter from 'busy-data/adapters/rpc-adapter';
import Assert from 'busy-utils/assert';

/***/
const { getOwner } = Ember;

/**
 * `BusyData/Mixins/RpcStore`
 *
 * @class RpcStore
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({
	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 * @public
	 * @method rpcRequest
	 * @param type {string} The RPC client to call the method
	 * @param method {string} The RPC method on the client
	 * @param params {object} The params to send to the method
	 * @param baseURL {string} Optional, Override url to the rpc client if different from the normal baseURL.
	 * @return {Ember.RSVP.Promise}
	 */
	rpcRequest(type, method, params={}, baseURL='') {
		Assert.funcNumArgs(arguments, 4);
		Assert.isString(type);
		Assert.isString(method);
		Assert.isObject(params);
		Assert.isString(baseURL);

		// initialize the rpc client
		const client = RPCAdapter.create(getOwner(this).ownerInjection(), {url: type});

		// set the url if baseURL is provided
		if (!Ember.isEmpty(baseURL)) {
			client.set('baseURL', baseURL);
		}

		// call the rpc method and return the promise.
		return client.call(method, params);
	}
});
