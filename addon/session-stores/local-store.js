/**
 * @module stores
 *
 */
import Ember from 'ember';
import LocalStore from 'ember-simple-auth/session-stores/local-storage';
import Configuration from 'busy-data/configuration';

function getStoreObject(key)
{
	Ember.assert("You must provide a string as the first param to getStoreObject", typeof key === 'string');

	return JSON.parse(localStorage.getItem(key)) || {};
}

function setStoreObject(key, value)
{
	Ember.assert("You must provide a string as the first param to setStoreObject", typeof key === 'string');
	Ember.assert("You must provide an object as the second param to setStoreObject", typeof value === 'object');

	localStorage.setItem(key, JSON.stringify(value));
}

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

	init()
	{
		this.key = Configuration.simpleAuthKey;
		
		this._super(...arguments);
	},

	/**
	 * this is the reference point for the suspended auth
	 * data stored in localstorage.
	 *
	 * @public
	 * @method suspendedKey
	 */
	suspendedKey()
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
	suspendAuth()
	{
		const oldKey = localStorage.getItem(Configuration.activeMemberKey);

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
	switchAuth(key)
	{
		Ember.assert('key must be a string in switchKey(key)', Ember.typeOf(key) === 'string');

		const authMap = getStoreObject(Configuration.authMapKey);

		Ember.assert('The key provided to switchKey(key) was not found in auth', Ember.get(authMap, key) !== undefined);

		localStorage.setItem(Configuration.activeMemberKey, Ember.get(authMap, key));
	},

	/**
	 * restores the auth account after the suspendAuth() method has been 
	 * invoked.
	 *
	 * @public
	 * @method resumeAuth
	 */
	resumeAuth()
	{
		const oldKey = this.suspendedKey();
		
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
	getAuthAccounts()
	{
		return getStoreObject(Configuration.simpleAuthKey);
	},

	getAuthId()
	{
		return localStorage.getItem(Configuration.activeMemberKey);
	},

	/**
	 * adds an account reference value to the account map for lookup of other accounts
	 *
	 * @public
	 * @method addAuthAccount
	 * @param key {string}
	 * @param value {string}
	 */
	addAuthAccount(key, value)
	{
		Ember.assert('key must be a string in addAuthAccount(key, value)', Ember.typeOf(key) === 'string');
		Ember.assert('value must be a string in addAuthAccount(key, value)', Ember.typeOf(key) === 'string');

		const accounts = getStoreObject(Configuration.authMapKey);
			
		accounts[key] = value;

		setStoreObject(Configuration.authMapKey, accounts);
	},

	persist(data)
	{
		data = data || {};
		let storedData =  getStoreObject(Configuration.simpleAuthKey);

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

		setStoreObject(Configuration.simpleAuthKey, storedData);

		return Ember.RSVP.resolve();
	},

	restore()
	{
		const data = getStoreObject(Configuration.simpleAuthKey);
		const id = localStorage.getItem(Configuration.activeMemberKey);

		if(!Ember.isNone(data) && !Ember.isEmpty(id) && !Ember.isNone(Ember.get(data, id)))
		{
			return Ember.RSVP.resolve(Ember.get(data, id));
		}
		else
		{
			return Ember.RSVP.resolve({});
		}
	},

	removeAuth(id)
	{
		Ember.assert("You must pass an id{string} to local-store.removeAuth()", typeof id === 'string');

		if(!Ember.isEmpty(id))
		{
			const data = getStoreObject(Configuration.simpleAuthKey);

			if(!Ember.isNone(data) && !Ember.isNone(Ember.get(data, id)))
			{
				delete data[id];
			}

			setStoreObject(Configuration.simpleAuthKey, data);
		}
	},

	clear()
	{
		localStorage.removeItem(Configuration.simpleAuthKey);
		localStorage.removeItem(Configuration.activeMemberKey);
		localStorage.removeItem(Configuration.authMapKey);
		localStorage.removeItem(Configuration.switchKey);
		this._lastData = {};
	}
});
