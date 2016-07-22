/**
 * @module addon/base
 *
 */
import Ember from 'ember';

const kDefaults = {
	API_VERSION: 0,
	API_URL: '',
	BATCH_GET: true,
	BATCH_POST: false,
	BATCH_PATCH: false,
	BATCH_DELETE: false,
	BATCH_PUT: false,
	DEBUG_MODE: false,
	XDEBUG_SESSION_START: false,
	usePatchInPlaceOfPut: false,

	authMapKey: 'session:map',
	switchKey: 'session:switch',
	activeMemberKey: 'session:active',
	simpleAuthKey: 'session:session', // has to be set in local-store.js
};

export default {

	baseURL: null,

	// api version
	API_VERSION: kDefaults.apiVersion,
	API_URL: kDefaults.apiURL,

	// use patch api calls instead of put calls
	usePatchInPlaceOfPut: kDefaults.usePatchInPlaceOfPut,

	// batch settings true if the batch
	// should try to batch calls of the specified type
	BATCH_GET: kDefaults.batchGET,
	BATCH_POST: kDefaults.batchPOST,
	BATCH_PATCH: kDefaults.batchPATCH,
	BATCH_DELETE: kDefaults.batchDELETE,
	BATCH_PUT: kDefaults.batchPUT,

	// true to turn on debug mode
	DEBUG_MODE: kDefaults.debugMode,
	XDEBUG_SESSION_START: kDefaults.XDEBUG_SESSION_START,

	authMapKey: kDefaults.authMapKey,
	switchKey: kDefaults.switchKey,
	activeMemberKey: kDefaults.activeMemberKey,
	simpleAuthKey: kDefaults.simpleAuthKey,

	/**
	 * load initializer method
	 *
	 */
	load(config)
	{
		let wrappedConfig = Ember.Object.create(config);
		for(let property in this)
		{
			if(property === 'authMapKey' || property === 'switchKey' || property === 'activeMemberKey' || property === 'simpleAuthKey')
			{
				this[property] = config.modulePrefix + '-' + wrappedConfig.getWithDefault(property, kDefaults[property]);
			}
			else if(this.hasOwnProperty(property) && Ember.typeOf(this[property]) !== 'function')
			{
				this[property] = wrappedConfig.getWithDefault(property, kDefaults[property]);
			}
		}


	}
};
