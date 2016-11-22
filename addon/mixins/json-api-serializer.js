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
		const response = this.convertResponse(store, primaryModelClass, payload, id, requestType);
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
	convertResponse(store, primaryModelClass, payload, id, requestType) {
		// get the data object or data array from the payload
		let rawData = this.getDataFromResponse(payload, requestType);
		if (singleRequest.indexOf(requestType) !== -1) {
			if(rawData.length > 1) {
				throw new Error(`${requestType} must not return more than 1 record in Model [${primaryModelClass.modelName}]`);
			}

			rawData = rawData[0];
			if (Ember.isNone(rawData) && !Ember.isNone(id)) {
				rawData = {id: id};
			} else if (Ember.isNone(rawData)) {
				rawData = {};
			}
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
				_data.push(this.buildJSON(store, primaryModelClass, type, item, included));
			});
		} else {
			// parse the data object
			_data = this.buildJSON(store, primaryModelClass, type, data, included);
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
	buildJSON(store, primaryModelClass, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(type);
		assert.isObject(json);
		assert.isArray(included);

		const primaryKey = Ember.get(this, 'primaryKey');

		// create a data type object
		const model = {
			id: Ember.get(json, primaryKey),
			type: this.nestedModelName(store, primaryModelClass, type),
			attributes: {},
			relationships: this.addRelationships(store, primaryModelClass, json)
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
						obj = this.buildNestedArray(store, primaryModelClass, i, value, included);
					} else {
						if (!Ember.get(value, primaryKey)) {
							value.id = uuid.generate();
						}
						// get the nested model
						obj = this.buildNested(store, primaryModelClass, i, value, included);
					}

					// add the obj to the relationship if it exists
					if (!Ember.isEmpty(obj)) {
						// add the relationship
						Ember.set(model.relationships, i, { data: obj });
					}
				} else {
					// add the property
					Ember.set(model.attributes, i, value);
				}
			}
		}
		return model;
	},

	addRelationships(store, primaryModelClass, json) {
		const data = {};
		primaryModelClass.eachRelationship((type, opts) => {
			// get the model name + -id and underscore it.
			let name = Ember.String.underscore(`${opts.type}-id`);

			// the key should be `id`
			let key = 'id';
			if (opts.options.referenceKey) {
				// if the referenceKey is id then the key should be the model name + `-id` underscored
				if (opts.options.referenceKey === 'id') {
					key = Ember.String.underscore(`${primaryModelClass.modelName}-id`);
				}
				// set the name to the referenceKey
				name = Ember.String.underscore(opts.options.referenceKey);
			}

			// foreignKey overrides all other key forms if set.
			// the key order ends up as (in order of override):  id, parent_model_name_id, foreign_key
			if (opts.options.foreignKey) {
				key = opts.options.foreignKey;
			}

			// get the id from the json object if it is set
			const id = Ember.get(json, name);

			// for a belongsTo relationship set the data as an object with `id` and `type`
			if (opts.kind === 'belongsTo') {
				Ember.assert(`belongsTo must reference the parent model id for DS.belongsTo('${opts.key}') in Model ${primaryModelClass.modelName}`, key === 'id');

				// create data object
				let _data = null;

				if (!Ember.isNone(id)) {
					_data = { type: opts.type };

					// add id for data object
					_data.id = id;
				}

				// set the data object for the relationship
				data[Ember.String.dasherize(opts.key)] = {data: _data};
			} else if (opts.kind === 'hasMany') { // for a has many set the data to an empty array
				// create data object
				let _data = {};
				let link = '';
				if (!Ember.isNone(opts.options.query)) {
					const keys = Object.keys(opts.options.query);
					keys.forEach(item => {
						link += `&${item}=${opts.options.query[item]}`;
					});
				}

				if (!Ember.isNone(id)) {
					// add id for data object
					link += `&${key}=${id}`;
				}

				if (!Ember.isEmpty(link)) {
					link = link.replace(/^&/, '?');
					_data.links = { related: `/${opts.type}${link}` };
				} else {
					_data.data = [];
				}

				data[Ember.String.dasherize(opts.key)] = _data;
			}
		});

		return data;
	},

	getModelReturnType(store, primaryModelClass, attr) {
		let kind = 'belongsTo';
		primaryModelClass.eachRelationship((key, opts) => {
			if (key === attr) {
				kind = opts.kind;
			}
		});

		if(kind === 'hasMany') {
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
	buildNested(store, primaryModelClass, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(type);
		assert.isObject(json);
		assert.isArray(included);

		// create the actual data model
		const _data = this.buildJSON(store, primaryModelClass, type, json, included);

		// add the data model to the included array
		included.push(_data);

		// create a relationship model representation
		const model = {
			type: this.nestedModelName(store, primaryModelClass, type),
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
	buildNestedArray(store, primaryModelClass, type, json, included) {
		assert.funcNumArgs(arguments, 5, true);
		assert.isString(type);
		assert.isArray(json);
		assert.isArray(included);

		const data = [];

		json.forEach(item => {
			// get the relationship data
			const model = this.buildNested(store, primaryModelClass, type, item, included);

			// add the relationships to the data return
			data.push(model);
		});

		// retrun the relationships
		return data;
	},

	nestedModelName(store, primaryModelClass, payloadKey) {
		if (primaryModelClass.modelName === payloadKey) {
			return payloadKey;
		} else {
			let result = payloadKey;
			primaryModelClass.eachRelationship((key, opts) => {
				if (payloadKey === key) {
					result = opts.type;
				}
			});
			return result;
		}
	},
});
