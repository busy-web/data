/**
 * @module addon/service
 *
 */
import Ember from 'ember';
import Configuration from './../configuration';

/**
 * `BusyData\Service\BusyData`
 *
 * This class defines how the application will
 * interface with an api.
 *
 * This is used to set api urls, version numbers, authenticated keys, ect.
 *
 */
export default Ember.Service.extend(
{
	session: Ember.inject.service('session'),

	autoBatch: null,
	manualBatch: null,

	init: function()
	{
		this._super();

		this.manualBatch = Ember.getOwner(this).lookup('adapter:batch-adapter');
		this.autoBatch = Ember.getOwner(this)._lookupFactory('adapter:batch-adapter').create({maxSize: 20, interval: 5});
	},

	host: Ember.computed(function()
	{
		return Configuration.API_URL;
	}),

	debug: Ember.computed(function()
	{
		return Configuration.DEBUG_MODE;
	}),

	debugUrlParam: Ember.computed(function()
	{
		return '_debug';
	}),

	xdebug: Ember.computed(function()
	{
		return 'XDEBUG_SESSION_START';
	}),

	xdebugSession: Ember.computed(function()
	{
		return Configuration.XDEBUG_SESSION_START;
	}),

	version: Ember.computed(function()
	{
		return Configuration.API_VERSION;
	}),

	versionUrlParam: Ember.computed(function()
	{
		return '_version';
	}),

	publicKey: Ember.computed('session.data.authenticated.public_key', function()
	{
		return this.get('session.data.authenticated.public_key');
	}),

	basicKey: Ember.computed('session.data.authenticated.auth_hash', function()
	{
		return this.get('session.data.authenticated.auth_hash');
	}),

	publicKeyAuthString: Ember.computed(function()
	{
		return 'Key-Authorization';
	}),

	basicKeyAuthString: Ember.computed(function()
	{
		return 'Authorization';
	}),

	shouldSendVersion: Ember.computed(function()
	{
		return true;
	}),

	invalidateSession: function()
	{
		this.get('session').invalidate('authenticator:basic', {});
	},

	authKey: Ember.computed('publicKey', 'basicKey', function()
	{
		var auth = null;
		if(!Ember.isNone(this.get('publicKey')))
		{
			auth = {type: 10, key: this.get('publicKey')};
		}
		else if(!Ember.isNone(this.get('basicKey')))
		{
			auth = {type: 20, key: this.get('basicKey')};
			if(this.get('basicKey').match(/:/))
			{
				auth = {type: 20, key: btoa(auth)};
			}
		}

		return auth;
	}),
});
