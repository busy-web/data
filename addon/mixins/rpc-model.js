/**
 * @module Mixins
 *
 */
import Mixin from '@ember/object/mixin';

/**
 * `BusyData/Mixins/RpcModel`
 *
 * @class RpcModel
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Mixin.create({
	/**
	 * flag to tell this is an rpc model
	 *
	 * @public
	 * @property _isRPC
	 * @type {boolean}
	 */
	_isRPC: true,

	/**
	 * The RPC client to call the method on
	 *
	 * @public
	 * @property _clientName
	 * @type {string}
	 */
	_clientName: null,

	/**
	 * The RPC clients method to call
	 *
	 * @public
	 * @property _methodName
	 * @type {string}
	 */
	_methodName: null,
});
