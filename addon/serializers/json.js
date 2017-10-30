/**
 * @module Serializers
 *
 */
import DS from 'ember-data';
import { get, getWithDefault } from '@ember/object';
import { underscore } from '@ember/string';
import { isNone } from '@ember/utils';
import { v4 } from 'ember-uuid';
import JsonApiSerializer from '@busybusy/data/mixins/json-api-serializer';

/**
 * `BusyData/Serializers/Json`
 *
 * @class Json
 * @namespace BusyData.Serializers
 * @extends DS.JSONAPISerializer
 */
export default DS.JSONAPISerializer.extend(JsonApiSerializer, {
	serializeAttribute(snapshot, json, key, attribute) {
		const type = attribute.type;
		if (this._canSerialize(key)) {
			let value = snapshot.attr(key);
			if (!isNone(type) && value !== undefined && value !== '_-NULL-_' && value !== '!_-NULL-_' && value !== '_-DISABLE-_')  {
				const transform = this.transformFor(type);
				value = transform.serialize(value, attribute.options);
			}

			if (key === 'createdOn' && isNone(value)) {
				value = parseInt(Date.now() / 1000, 10);
			}

			if (!isNone(value) && value.hasOwnProperty('file') && (value.file instanceof File || value.file instanceof Blob)) {
				json._fileObject = value;
				value = value.get('file');

				// set the record to null so it wont get submitted again
				snapshot.record.file = null;
			}

			if (value !== undefined) {
				// if provided, use the mapping provided by `attrs` in
				// the serializer
				let payloadKey =  this._getMappedKey(key, snapshot.type);
				if (payloadKey === key && this.keyForAttribute) {
					payloadKey = this.keyForAttribute(key, 'serialize');
				}

				json[payloadKey] = value;
			}
		}
	},

	generateIdForRecord() {
		return v4.apply(v4, arguments);
	},

	keyForAttribute(key) {
		// look for underscored api properties
		return underscore(key);
	},

	modelNameFromPayloadKey(key) {
		return key;
	},

	getDataFromResponse(payload) {
		// get the data array from the payload
		return get(payload, 'data');
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
		const isNew = getWithDefault(snapshot, 'record.isNew', false);

		if (options && options.includeId) {
			if (snapshot.id) {
				data[get(this, 'primaryKey')] = snapshot.id;
			}
		}

		const changeAttrs = Object.keys(getWithDefault(snapshot, '_internalModel._inFlightAttributes', {}));
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
				if (data[key] !== undefined) {
					hash[key] = data[key];
				}
			}
		}
	}
});
