/**
 * @module addon/base
 *
 */
import Ember from 'ember';

const kDefaults = {
	apiVersion: 0,
	apiURL: '',
	usePatchInPlaceOfPut: false,
	batchGet: true,
	batchPOST: false,
	batchPATCH: false,
	batchDELETE: false,
	batchPUT: false,
	debugMode: false,
	publicHashKey: 'public-key-hash',
	basicAuthHashKey: 'basic-auth-hash',
	basicAuthKey: 'basic-auth',
};

export default {

	baseURL: null,

	// api version
	apiVersion: kDefaults.apiVersion,
	apiURL: kDefaults.apiURL,

	// use patch api calls instead of put calls
	usePatchInPlaceOfPut: kDefaults.usePatchInPlaceOfPut,

	// batch settings true if the batch
	// should try to batch calls of the specified type
	batchGET: kDefaults.batchGET,
	batchPOST: kDefaults.batchPOST,
	batchPATCH: kDefaults.batchPATCH,
	batchDELETE: kDefaults.batchDELETE,
	batchPUT: kDefaults.batchPUT,

	// true to turn on debug mode
	debugMode: kDefaults.debugMode,

	// auth token keys for api headers
	publicHashKey: kDefaults.publicKeyHash,
	basicAuthHashKey: kDefaults.basicAuthHash,
	basicAuthKey: kDefaults.basicAuth,
	
	/**
	 * load initializer method
	 *
	 */
	load(config) 
	{
		let wrappedConfig = Ember.Object.create(config);
		for(let property in this) 
		{
			if(this.hasOwnProperty(property) && Ember.typeOf(this[property]) !== 'function')
			{
				this[property] = wrappedConfig.getWithDefault(property, kDefaults[property]);
			}
		}
	}
};
