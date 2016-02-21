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

	host: function()
	{
		return Configuration.API_URL;
	}.property(),

	debug: function()
	{
		return Configuration.DEBUG_MODE;
	}.property(),

	debugUrlParam: function()
	{
		return '_debug';
	}.property(),

	version: function()
	{
		return Configuration.API_VERSION;
	}.property(),

	versionUrlParam: function()
	{
		return '_version';
	}.property(),

	publicKey: function()
	{
		return this.get('session.session.authenticated.public_key');
	}.property(),

	basicKey: function()
	{
		return this.get('session.session.authenticated.auth_hash');
	}.property(),

	publicKeyAuthString: function()
	{
		return 'Key-Authorization';
	}.property(),

	basicKeyAuthString: function()
	{
		return 'Authorization';
	}.property(),

	shouldSendVersion: function()
	{
		return true;
	}.property(),

	invalidateSession: function()
	{
		this.get('session').invalidate('authenticator:basic', {});
	},

	authKey: function()
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
	}.property('publicKey', 'basicKey'),
});
