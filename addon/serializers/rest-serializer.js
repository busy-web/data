/**
 * @module addon/serializers
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import uuid from 'busy-utils/uuid';

const { isNone, get } = Ember;

/**
 * `BusyData\RestSerializer`
 *
 */
export default DS.RESTSerializer.extend({
	rpcToken: null,

	/**
	 * generates a simple unique id as a placeholder
	 * for ember-data with busy rpc model.
	 *
	 * @private
	 * @method rpcId
	 * @returns {string}
	 */
	rpcId() {
		const token = this.get('rpcToken') || 0;
		this.set('rpcToken', token + 1);
		return 'rpc-model-' + token;
	},

	normalizeResponse(store, type, payload, id, requestType) {
		if (requestType === 'rpcQuery') {
			requestType = 'query';

			// Some rpc calls dont return an object. These calls
			// can return a bool or just a value. This checks for them
			// and returns the value as and object with a generated id
			// and a value key.
			if (!isNone(payload.data) && typeof payload.data !== 'object') {
				payload.data = {
					id: this.rpcId(),
					value: payload.data
				};
			}

			// convert all objects to array of one object.
			if (isNone(get(payload.data, 'length'))) {
				payload.data = [payload.data];
			}
		}

		const data = this.flattenPayload(type.modelName, payload.data);
		data.meta = {
			next: payload.next,
			prev: payload.prev,
			returnedRows: payload.returned_rows,
			totalRows: payload.total_rows,
		};

		return this._super(store, type, data, id, requestType);
	},

	flattenPayload(modelType, data) {
		const _data = {};
		_data[modelType] = data;
		if (isNone(data) || typeof data !== 'object') {
			return _data;
		}

		if (data.length > 0) {
			this.flattenArray(modelType, _data, data);
		} else {
			this.flattenObject(modelType, _data, data);
		}
		return _data;
	},

	flattenArray(modelType, parentObj, data) {
		for (let key in data) {
			if (data.hasOwnProperty(key) && !isNone(data[key]) && typeof data[key] === 'object') {
				this.flattenObject(modelType, parentObj, data[key]);
			}
		}
	},

	flattenObject(modelType, parentObj, data) {
		for (let key in data) {
			if (data.hasOwnProperty(key) && !isNone(data[key]) && typeof data[key] === 'object') {
				const item = data[key];
				const name = this.nestedModelName(modelType, key);

				if (!isNone(get(item, 'length'))) {
					if (!Ember.isEmpty(item)) {
						this.flattenArray(modelType, parentObj, item);

						const ids = [];
						for (let index in item) {
							if (item.hasOwnProperty(index)) {
								if (isNone(item[index].id)) {
									item[index].id = uuid.generate();
								}
								ids.push(item[index].id);
							}
						}

						parentObj[name] = item;
						data[key] = ids;
					} else {
						delete data[key];
					}
				} else {
					this.flattenObject(modelType, parentObj, data[key]);

					if (isNone(item.id)) {
						item.id = uuid.generate();
					}

					parentObj[name] = [item];
					data[key] = item.id;
				}
			}
		}
	},

	modelNameFromPayloadKey(key) {
		return key;
	},

	nestedModelName(modelType, payloadKey) {
		const model = this.store.rpcModelFor(modelType);
		const map = get(model, 'relationships');
		let result = payloadKey;

		map.forEach((item, key) => {
			if (payloadKey === item.objectAt(0).name) {
				result = key;
			}
		});
		return result;
	},

	normalize(type, hash, prop) {
		const data = {};
		for (let key in hash) {
			if (hash.hasOwnProperty(key)) {
				data[key.camelize()] = hash[key];
			}
		}
		return this._super(type, data, prop);
	},

	serializeAttribute(snapshot, json, key, attribute) {
		const type = attribute.type;
		if (this._canSerialize(key)) {
			let value = snapshot.attr(key);
			if (type && value !== '_-NULL-_' && value !== '!_-NULL-_' && value !== '_-DISABLE-_')  {
				var transform = this.transformFor(type);
				value = transform.serialize(value);
			}

			// if provided, use the mapping provided by `attrs` in
			// the serializer
			let payloadKey =  this._getMappedKey(key, snapshot.type);
			if (payloadKey === key && this.keyForAttribute) {
				payloadKey = this.keyForAttribute(key, 'serialize');
			}

			if (payloadKey === 'createdOn' && isNone(value)) {
				value = this.utcTime();
			}

			if (!isNone(value) && value.hasOwnProperty('file') && (value.file instanceof File || value.file instanceof Blob)) {
				json._fileObject = value;
				value = value.get('file');

				// set the record to null so it wont get submitted again
				snapshot.record.file = null;
			}

			json[payloadKey.underscore()] = value;
		}
	},

	utcTime() {
		return (new Date()).valueOf()/1000;
	},

	generateIdForRecord() {
		//return Math.random().toString(32).slice(2).substr(0, 5);
		return uuid.generate();
	},

	serializeIntoHash(hash, type, snapshot, options) {
		const dataHash = this.serialize(snapshot, options, true);
		for(let key in dataHash) {
			if (dataHash.hasOwnProperty(key)) {
				if (!isNone(dataHash[key])) {
					hash[key] = dataHash[key];
				}
			}
		}
	}
});
