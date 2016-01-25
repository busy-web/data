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
	usePatchInPlaceOfPut: false,
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
