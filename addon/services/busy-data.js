/**
 * @module addon/service
 *
 */
import Ember from 'ember';

/**
 * `BusyData\BusyDataService`
 *
 * This class defines how the application will 
 * interface with an api.
 *
 * This is used to set api urls, version numbers, authenticated keys, ect.
 *
 */
export default Ember.Service.extend(
{
	host: function()
	{
		return 'http://localhost:4200';
	}.property(),

	debug: function()
	{
		return false;
	}.property(),

	debugUrlParam: function()
	{
		return '_debug';
	}.property(),

	version: function()
	{
		return '1';
	}.property(),

	versionUrlParam: function()
	{
		return '_version';
	}.property(),

	publicKey: function()
	{
		return null;
	}.property(),

	basicKey: function()
	{
		return null;
	}.property(),

	shouldSendVersion: function()
	{
		return true;
	}.property(),

	invalidateSession: function()
	{
		Ember.warn("invalidateSession can be overridden to invalidate a user session based on a 401 statusCode");
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
			if(auth.match(/:/))
			{
				auth = {type: 20, key: btoa(auth)};
			}
		}

		return auth;
	}.property('publicKey', 'basicKey'),
});
