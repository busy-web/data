/**
 * @module Mixins
 *
 */
import Mixin from '@ember/object/mixin';
import { Assert } from 'busy-utils';

/**
 * `BusyData/Mixins/RpcStore`
 *
 * @class RpcStore
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Mixin.create({
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

		const adapter = this._instanceCache.get('adapter');

		// call the rpc method and return the promise.
		return adapter.rpcRequest(this, type, method, params, baseURL);
	}
});
