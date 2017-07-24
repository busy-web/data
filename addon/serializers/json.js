/**
 * @module Serializers
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import JSONAPIMixin from 'busy-data/mixins/json-api-serializer';
import { UUID } from 'busy-utils';

/**
 * `BusyData/Serializers/Json`
 *
 * @class Json
 * @namespace BusyData.Serializers
 * @extends DS.JSONAPISerializer
 */
export default DS.JSONAPISerializer.extend(JSONAPIMixin, {
	serializeAttribute(snapshot, json, key, attribute) {
		const type = attribute.type;
		if (this._canSerialize(key)) {
			let value = snapshot.attr(key);
			if (type && value !== '_-NULL-_' && value !== '!_-NULL-_' && value !== '_-DISABLE-_')  {
				const transform = this.transformFor(type);
				value = transform.serialize(value, attribute.options);
			}

			// if provided, use the mapping provided by `attrs` in
			// the serializer
			let payloadKey =  this._getMappedKey(key, snapshot.type);
			if (payloadKey === key && this.keyForAttribute) {
				payloadKey = this.keyForAttribute(key, 'serialize');
			}

			if (key === 'createdOn' && Ember.isNone(value)) {
				value = (new Date()).valueOf()/1000;
			}

			if (!Ember.isNone(value) && value.hasOwnProperty('file') && (value.file instanceof File || value.file instanceof Blob)) {
				json._fileObject = value;
				value = value.get('file');

				// set the record to null so it wont get submitted again
				snapshot.record.file = null;
			}

			if (!Ember.isNone(value)) {
				json[payloadKey] = value;
			}
		}
	},

	generateIdForRecord() {
		return UUID.generate();
	},

	keyForAttribute(key) {
		// look for underscored api properties
		return Ember.String.underscore(key);
	},

	modelNameFromPayloadKey(key) {
		return key;
	},

	getDataFromResponse(payload) {
		// get the data array from the payload
		return Ember.get(payload, 'data');
	},

	getMetaFromResponse(payload) {
		// add meta to response
		return {
			next: payload.next,
			prev: payload.prev,
			returnedRows: payload.returned_rows,
			totalRows: payload.total_rows,
		};
	},

	warnMessageForUndefinedType() {
		return 'Type is undefined';
	},

	serialize(snapshot, options) {
		const data = {};
		const isNew = Ember.getWithDefault(snapshot, 'record.isNew', false);

		if (options && options.includeId) {
			if (snapshot.id) {
				data[Ember.get(this, 'primaryKey')] = snapshot.id;
			}
		}

		const changeAttrs = Object.keys(Ember.getWithDefault(snapshot, '_internalModel._inFlightAttributes', {}));
		snapshot.eachAttribute((key, attribute) => {
			if (isNew || changeAttrs.indexOf(key) !== -1) {
				this.serializeAttribute(snapshot, data, key, attribute);
			}
		});

		snapshot.eachRelationship((key, relationship) => {
			if (relationship.kind === 'belongsTo') {
				this.serializeBelongsTo(snapshot, data, relationship);
			} else if (relationship.kind === 'hasMany') {
				this.serializeHasMany(snapshot, data, relationship);
			}
		});

		return { data };
	},

	serializeIntoHash(hash, type, snapshot, options) {
		const dataHash = this.serialize(snapshot, options, true);
		const data = dataHash.data;

		delete data.relationships;

		for(let key in data) {
			if (data.hasOwnProperty(key)) {
				if (!Ember.isNone(data[key])) {
					hash[key] = data[key];
				}
			}
		}
	}
});
