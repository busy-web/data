/**
 * @module stores
 *
 */
import Ember from 'ember';
import LocalStore from 'ember-simple-auth/session-stores/local-storage';
import Configuration from 'busy-data/configuration';

/**
 * `Stores/LocalStorage`
 *
 * @class LocalStorage class
 *
 * @extends SimpleAuth.LocalStorage
 */
export default LocalStore.extend(
{
	key: '',

	init: function()
	{
		this.key = Configuration.simpleAuthKey;
		
		this._super();
	},

	/**
	 * this is the reference point for the suspended auth
	 * data stored in localstorage.
	 *
	 * @public
	 * @method suspendedKey
	 */
	suspendedKey: function()
	{
		return localStorage.getItem(Configuration.switchKey);
	},

	/**
	 * removes the authenticated member but keeps the data stored
	 * in localstorage referenced with suspendedKey() for retrieval
	 *
	 * @public
	 * @method suspendAuth
	 */
	suspendAuth: function()
	{
		var oldKey = localStorage.getItem(Configuration.activeMemberKey);

		localStorage.setItem(Configuration.switchKey, oldKey);
		localStorage.setItem(Configuration.activeMemberKey, '');
	},

	/**
	 * switches the authenticated account using the same key
	 * that is passed to addAuthAccount(key, value)
	 *
	 * @public
	 * @method switchAuth
	 */
	switchAuth: function(key)
	{
		Ember.assert('key must be a string in switchKey(key)', Ember.typeOf(key) === 'string');

		var authMap = localStorage.getItem(Configuration.authMapKey);
			authMap = JSON.parse(authMap);

		localStorage.setItem(Configuration.activeMemberKey, authMap[key]);
	},

	/**
	 * restores the auth account after the suspendAuth() method has been 
	 * invoked.
	 *
	 * @public
	 * @method resumeAuth
	 */
	resumeAuth: function()
	{
		var oldKey = this.suspendedKey();
		
		localStorage.setItem(Configuration.activeMemberKey, oldKey);
		localStorage.setItem(Configuration.switchKey, '');
	},

	/**
	 * gets all auth account data from the localstorage. returns
	 * an array of auth objects
	 *
	 * @public
	 * @method getAuthAccounts
	 */
	getAuthAccounts: function()
	{
		return JSON.parse(localStorage.getItem(Configuration.simpleAuthKey));
	},

	/**
	 * adds an account reference value to the account map for lookup of other accounts
	 *
	 * @public
	 * @method addAuthAccount
	 * @param key {string}
	 * @param value {string}
	 */
	addAuthAccount: function(key, value)
	{
		Ember.assert('key must be a string in addAuthAccount(key, value)', Ember.typeOf(key) === 'string');
		Ember.assert('value must be a string in addAuthAccount(key, value)', Ember.typeOf(key) === 'string');

		var accounts = JSON.parse(localStorage.getItem(Configuration.authMapKey)) || {};
			accounts[key] = value;

		localStorage.setItem(Configuration.authMapKey, JSON.stringify(accounts));
	},

	persist: function(data)
	{
		data = data || {};
		var storedData = JSON.parse(localStorage.getItem(Configuration.simpleAuthKey)) || {};

		if(data.authenticated !== undefined && data.authenticated.invalidate)
		{
			storedData = {};
			localStorage.setItem(Configuration.activeMemberKey, '');
			localStorage.setItem(Configuration.authMapKey, '');
		}
		else if(data.authenticated !== undefined && data.authenticated.id !== undefined)
		{
			storedData[data.authenticated.id] = data;
			localStorage.setItem(Configuration.activeMemberKey, data.authenticated.id);
		}

		var json = JSON.stringify(storedData);
		localStorage.setItem(Configuration.simpleAuthKey, json);

		this._lastData = this.restore();
	},

	restore: function()
	{
		var data = localStorage.getItem(Configuration.simpleAuthKey);
		var id = localStorage.getItem(Configuration.activeMemberKey);

		data = JSON.parse(data);

		return data[id] || {};
	},

	clear: function()
	{
		localStorage.removeItem(Configuration.simpleAuthKey);
		localStorage.removeItem(Configuration.activeMemberKey);
		localStorage.removeItem(Configuration.authMapKey);
		localStorage.removeItem(Configuration.switchKey);
		this._lastData = {};
	}
});
