/**
 * @module Mixins
 *
 */
import { isEmpty } from '@ember/utils';
import Mixin from '@ember/object/mixin';
import { getOwner } from '@ember/application';
import RPCAdapter from 'busy-data/adapters/rpc-adapter';

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
		// initialize the rpc client
		const client = RPCAdapter.create(getOwner(this).ownerInjection(), {url: type});

		// set the url if baseURL is provided
		if (!isEmpty(baseURL)) {
			client.set('baseURL', baseURL);
		}

		// call the rpc method and return the promise.
		return client.call(method, params);
	}
});
