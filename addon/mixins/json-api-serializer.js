/**
 * @module Mixins
 *
 */
import Ember from 'ember';
import assert from 'busy-utils/assert';
import uuid from 'busy-utils/uuid';

/***/
const singleRequest = ['findRecord', 'queryRecord', 'updateRecord', 'createRecord'];

/**
 * `Mixins/JSONAPISerializer`
 *
 * Converts a standard api response to a json-api response
 *
 * This is a mixin that can be added to a JSONAPISerializer to
 * convert an api response to a json-api response object before
 * the normalizeResponse has started.
 *
 * @class JSONAPISerializer
 * @namespace BusyData.Mixin
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({

	/**
	 * Override of normalizeResponse in Ember Data serialize
	 *
	 * @private
	 * @method normalizeResponse
	 * @param store {Ember.Store}
	 * @param primaryModelClass {DS.Model}
	 * @param payload {object} json data
	 * @param requestType {string} ember data request type
	 * @return {object}
	 */
	normalizeResponse(store, primaryModelClass, payload, id, requestType) {
		let response;
		if (!payload.jsonapi) {
			if (requestType === 'deleteRecord') { // delete record should return a no content response
				response = {
					status: '204 No Content',
					data: null,
					jsonapi: { version: "1.0" }
				};

				if (payload.code && payload.code.length > 0) {
					response.status = '400 Bad Request';
					response.code = payload.code[0];
				}
			} else {
				response = this.convertResponse(store, primaryModelClass, payload, requestType);
			}
		} else {
			response = payload;
		}

		return this._super(store, primaryModelClass, response, id, requestType);
	},

	/**
	 * Converts an api response to a json-api formatted response
	 *
	 * @private
	 * @method convertResponse
	 * @param store {Ember.Store}
	 * @param primaryModelClass {DS.Model}
	 * @param payload {object} json data
	 * @param requestType {string} ember data request type
	 * @return {object}
	 */
	convertResponse(store, primaryModelClass, payload, requestType) {
		// get the data object or data array from the payload
		let rawData = this.getDataFromResponse(payload, requestType);
		if (singleRequest.indexOf(requestType) !== -1) {
			if(rawData.length > 1) {
				throw new Error(`${requestType} must not return more than 1 record`);
			}
			rawData = rawData[0];
		}

		// get the meta properties as an object from the payload
		const meta = this.getMetaFromResponse(payload, requestType);
		assert.isObject(meta);

		// create a flat json-api object
		const data = this.flattenResponseData(store, primaryModelClass, rawData);

		// add meta data
		Ember.set(data, 'meta', meta);

		// return the resposne
		return data;
	},

	/**
	 * Gets the data from the response object. This is
	 * meant to be overriden in a sub class to provide the path
	 * to the data object in the api response.
	 *
	 * @public
	 * @method getDataFromResponse
	 * @param payload {object} api response json object
	 * @param requestType {string} ember data request type
	 * @return {object|array}
	 */
	getDataFromResponse(payload/*, requestType */) {
		return payload;
	},

	/**
	 * Gets the properties from the payload
	 * that should go into the meta object.
	 *
	 * This must be returned as an object.
	 *
	 * @public
	 * @method getMetaFromResponse
	 * @param payload {object} api response object
	 * @param requestType {string} the type of api request
	 * @return {object}
	 */
	getMetaFromResponse(/*payload, requestType*/) {
		return {};
	},

	/**
	 * method to take a nested model json structure and convert it
	 * to a json api flat json object
	 *
	 * @private
	 * @method flattenResponseData
	 * @param store {Ember.Store}
	 * @param primaryModelClass {DS.Model}
	 * @param data {object|array}
	 * @return {object}
	 */
	flattenResponseData(store, primaryModelClass, data) {
		assert.funcNumArgs(arguments, 3, true);

		// the new json-api formatted object to return
		const json = {
			jsonapi: { version: '1.0' }
		};

		// array to track included models
		const included = [];
		const type = primaryModelClass.modelName;

		// the data object for the json-api response
		let _data;
		if(Ember.typeOf(data) === 'array') {
			// parse the data array objects
			_data = [];
			data.forEach(item => {
				_data.push(this.buildJSON(store, type, type, item, included));
			});
		} else {
			// parse the data object
			_data = this.buildJSON(store, type, type, data, included);
		}

		// set the included data array
		json.included = included;

		// set the data property
		json.data = _data;

		// return the new json-api structure
		return json;
	},

	/**
	 * Helper method to recursively parse the api response
	 * and convert it to a flat json-api object
	 *
	 * @private
	 * @method buildJSON
	 * @param store {Ember.Store}
	 * @param modelName {string}
	 * @param type {string} the model type
	 * @param json {object} the json object to parse
	 * @param included {array} Included property for the json-api object
	 * @return {object}
	 */
	buildJSON(store, modelName, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(modelName);
		assert.isString(type);
		assert.isObject(json);
		assert.isArray(included);

		const primaryKey = Ember.get(this, 'primaryKey');

		// create a data type object
		const model = {
			id: Ember.get(json, primaryKey),
			type: this.nestedModelName(store, modelName, type),
			attributes: {},
			relationships: {}
		};

		// find all attributes and nested models
		for (let i in json) {
			if (json.hasOwnProperty(i)) {
				const value = Ember.get(json, i);
				// an object is going to be a nested model
				if(!Ember.isNone(value) && typeof value === 'object') {
					let obj;
					// embers typeOf will tell if the object is an array
					if (Ember.typeOf(value) === 'array') {
						// get the nested models
						obj = this.buildNestedArray(store, modelName, i, value, included);
					} else {
						if (!Ember.get(value, primaryKey)) {
							value.id = uuid.generate();
						}
						// get the nested model
						obj = this.buildNested(store, modelName, i, value, included);
					}

					// force a proper return type from bad apis without consistency.
					if (Ember.isEmpty(obj)) {
						obj = this.getModelReturnType(store, modelName, i);
					}

					// add the relationship
					Ember.set(model.relationships, i, { data: obj});
				} else {
					// add the property
					Ember.set(model.attributes, i, value);
				}
			}
		}
		return model;
	},

	getModelReturnType(store, modelName, attr) {
		const record = store.createRecord(modelName, {});
		const relationship = record.relationshipFor(attr);
		if(relationship.kind === 'hasMany') {
			return [];
		} else {
			return null;
		}
	},

	/**
	 * Helper method to recursively parse the api response
	 * and convert it to a flat json-api object
	 *
	 * @private
	 * @method buildNested
	 * @param store {Ember.Store}
	 * @param modelName {string}
	 * @param type {string} the model type
	 * @param json {object} the json object to parse
	 * @param included {array} Included property for the json-api object
	 * @return {object}
	 */
	buildNested(store, modelName, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(modelName);
		assert.isString(type);
		assert.isObject(json);
		assert.isArray(included);

		// create the actual data model
		const _data = this.buildJSON(store, modelName, type, json, included);

		// add the data model to the included array
		included.push(_data);

		// create a relationship model representation
		const model = {
			type: this.nestedModelName(store, modelName, type),
			id: _data.id
		};

		return model;
	},

	/**
	 * Helper method to recursively parse the api response
	 * and convert it to a flat json-api object
	 *
	 * @private
	 * @method buildNestedArray
	 * @param store {Ember.Store}
	 * @param modelName {string}
	 * @param type {string} the model type
	 * @param json {array} the json object to parse
	 * @param included {array} Included property for the json-api object
	 * @return {object}
	 */
	buildNestedArray(store, modelName, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(modelName);
		assert.isString(type);
		assert.isArray(json);
		assert.isArray(included);

		const data = [];

		json.forEach(item => {
			// get the relationship data
			const model = this.buildNested(store, modelName, type, item, included);

			// add the relationships to the data return
			data.push(model);
		});

		// retrun the relationships
		return data;
	},

	nestedModelName(store, modelType, payloadKey) {
		if (modelType === payloadKey) {
			return payloadKey;
		} else {
			let model;
			if (/rpc/.test(modelType)) {
				model = store.rpcModelFor(modelType);
			} else {
				model = store.modelFor(modelType);
			}

			const map = Ember.get(model, 'relationships');
			let result = payloadKey;
			map.forEach((item, key) => {
				if (payloadKey === item.objectAt(0).name) {
					result = key;
				}
			});

			return result;
		}
	},
});
