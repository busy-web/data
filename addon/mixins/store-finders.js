/**
 * @module store
 *
 */
import { getOwner } from '@ember/application';
import Mixin from '@ember/object/mixin';
import { isArray } from '@ember/array';
import { isNone, isEmpty } from '@ember/utils';
import { get, set, getWithDefault } from '@ember/object';
import { merge } from '@ember/polyfills';
import { run } from '@ember/runloop';
import { Promise as EmberPromise, resolve, all } from 'rsvp';
import { runInDebug, assert } from '@ember/debug';
import DS from 'ember-data';

/***/
const { PromiseArray } = DS;

/**
 * `StoreFinders`
 *
 * Mixin that adds extra find methods to the store service
 */
export default Mixin.create({
	_maxPageSize: 80,

	findAll(modelType, _query={}) {
		// copy query object
		const query = merge({}, _query);

		if (isNone(get(query, 'limit'))) {
			set(query, 'page_size', getWithDefault(query, 'page_size', this._maxPageSize));
			set(query, 'page', getWithDefault(query, 'page', 1));
		}

		// make query request
		return this.query(modelType, query).then(models => {
			let nextQuery = {};
			if (nextParams(models, nextQuery, query)) {
				return this.findAll(modelType, nextQuery).then(moreModels => {
					if (moreModels && get(moreModels, 'length') > 0) {
						let mArray = moreModels.toArray().map(item => get(item, '_internalModel') || item);
						models.pushObjects(mArray);
						let meta = get(models, 'meta');
						let moreMeta = get(moreModels, 'meta');
						meta.next = moreMeta.next;
						meta.returnedRows = meta.returnedRows + moreMeta.returnedRows

						set(models, 'meta', meta);
					}
					return models;
				});
			} else {
				return models;
			}
		});
	},

	findByIds(modelType, ids, query={}) {
		query.deleted_on = '_-DISABLE-_';
		return this.findWhereIn(modelType, 'id', ids, query);
	},

	findWhereIn(modelType, key, values, query={}) {
		assert('modelType must be of type string in store.findWhereIn()', typeof modelType === 'string');
		assert('key must be of type string in store.findWhereIn()', typeof key === 'string');
		assert('values must be an array of strings in store.findWhereIn()', isArray(values));
		assert('query must be an object in store.findWhereIn()', typeof query === 'object');

		const _values = values.slice(0);
		const queryList = [];
		while(_values.length) {
			const __values = _values.splice(0, 10);
			if (/^!/.test(key)) {
				queryList.push(
					merge({ _not_in: { [key]: __values } }, query)
				);
			} else {
				queryList.push(
					merge({ _in: { [key]: __values } }, query)
				);
			}
		}

		return this._findRecords(modelType, queryList, null);
	},

	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 * @public
	 * @method rpcRequest
	 * @param type {string} The RPC client to call the method
	 * @param method {string} The RPC method on the client
	 * @param params {object} The params to send to the method
	 * @param baseURL {string} Optional, Override url to the rpc client if different from the normal baseURL.
	 * @return {EmberPromise}
	 */
	rpcRequest(client, method, params={}, baseURL='') {
		assert('client must be of type string in store.rpcRequest()', typeof client === 'string');
		assert('method must be of type string in store.rpcRequest()', typeof method === 'string');
		assert('params must be an object in store.rpcRequest()', !isNone(params) && typeof params === 'object');
		assert('baseURL must be of type string in store.rpcRequest()', typeof baseURL === 'string');

		let owner = getOwner(this);

		// support ember 2.0
		let adapter = get(this, '_instanceCache.adapter');
		if (isNone(adapter)) {
			// support ember 3.0
			adapter = get(this, '_adapterCache.application') || owner.lookup('adapter:application');
			if (isNone(adapter)) {
				let adapterName = get(this, 'adapter');
				adapter = get(this, `_adapterCache.${adapterName}`) || owner.lookup(`adapter:${adapterName}`);
			}
		}

		assert("In order to use rpcRequest your must include the rpc-adapter mixin in your adapter", !isNone(adapter.rpcRequest));

		// call the rpc method and return the promise.
		return adapter.rpcRequest(this, client, method, params, baseURL);
	},

	/**
	 *
	 * TODO: test this
	 * add recordArray.update method for update calls to _findRecords
	 *
	 */
	_findRecords(modelName, query, array) {
    array = array || this.recordArrayManager.createAdapterPopulatedRecordArray(modelName, query);
		set(array, '_update', () => {
			return this._findRecords(get(array, 'modelName'), get(array, 'query'), array);
		});

		let adapter = this.adapterFor(modelName);

    assert(`You tried to load a query but you have no adapter (for ${modelName})`, adapter);
    assert(`You tried to load a query but your adapter does not implement 'query'`, typeof adapter.query === 'function');

		// adapter.query needs the class
		let modelClass = this.modelFor(modelName);

		// call findRecords and return the promsie
		let promise;
		if (isArray(query)) {
			promise = _findRecordQueue(adapter, this, modelClass, query.slice(0)).then(payload => _processResults(this, array, payload));
		} else {
			promise = _findRecords(adapter, this, modelClass, query).then(payload => _processResults(this, array, payload));
		}
		return PromiseArray.create({ promise });
	}
});


function _findRecordQueue(adapter, store, modelClass, queryObjects) {
	// no queryObjects then return a default jsonapi response
	if (queryObjects.length <= 0) {
		return resolve({
			data: [],
			included: [],
			jsonapi: { version: '1.0' },
			meta: { returnedRows: 0 }
		});
	}

	return new EmberPromise((resolve, reject) => {
		const promises = [];
		// call _findRecords on each query object
		queryObjects.forEach(query => promises.push(_findRecords(adapter, store, modelClass, query)));

		// parse the results of all calls an merge them into one result
		all(promises).then(results => _mergeRecords(results))
			.then(records => get(records, 'errors') ? run(null, reject, records) : run(null, resolve, records))
			.catch(err => run(null, reject, err));
	});
}

/**
 * generic api getter for making callse to the api.
 *
 * NOTE:
 * This call returns a jsonapi formatted object. _processResults
 * must be called to convert the object to a recordArray.
 *
 * @method _findRecords
 * @params adapter {DS.Adapter}
 * @params store {DS.Store}
 * @params modelClass {DS.Model}
 * @params query {Object}
 * @returns {Object}
 */
function _findRecords(adapter, store, modelClass, query) {
  let promise = adapter.query(store, modelClass, query);
  let label = `DS: Handle Adapter#query of ${modelClass}`;

  promise = EmberPromise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
		let serializer = serializerForAdapter(store, adapter, modelClass.modelName);
		let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'query');

		let nextQuery = {};
		if (nextParams(payload, nextQuery, query)) {
			return _findRecords(adapter, store, modelClass, nextQuery).then(nextPayload => _mergeRecords([payload, nextPayload]));
		} else {
			return payload;
		}
	}, null, `DS: Extract payload of query ${modelClass.modelName}`);
}

function _processResults(store, recordArray, payload) {
	let internalModels = store._push(payload);

	assert('The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.', Array.isArray(internalModels));

	recordArray._setInternalModels(internalModels, payload);
	return recordArray;
}

function _mergeRecords(records) {
	let recordOut
	records.forEach(record => {
		if (!recordOut) {
			recordOut = record;
		} else {
			if (get(recordOut, 'meta')) {
				// get returned rows
				set(recordOut, 'meta.returnedRows', getWithDefault(recordOut, 'meta.returnedRows', 0) + getWithDefault(record, 'meta.returnedRows', 0));

				// keep track of next calls if there are any
				set(recordOut, 'meta.next', get(record, 'meta.next'));

				if (get(recordOut, 'meta.totalRows') !== get(record, 'meta.totalRows')) {
					// get total rows
					set(recordOut, 'meta.totalRows', getWithDefault(recordOut, 'meta.totalRows', 0) + getWithDefault(record, 'meta.totalRows', 0));
				}
			}

			if (get(recordOut, 'links')) {
				// keep track of next calls if there are any
				set(recordOut, 'links.next', get(record, 'links.next'));
			}

			// merged data arrays
			set(recordOut, 'data', get(recordOut, 'data').concat(get(record, 'data')));

			// combine api errors
			if (get(recordOut, 'errors') && get(record, 'errors')) {
				set(recordOut, 'errors', get(recordOut, 'errors').concat(get(record, 'errors')));
			} else if (!get(recordOut, 'errors') && get(record, 'errors')) {
				set(recordOut, 'errors', get(record, 'errors'));
			}
		}
	});
	return recordOut;
}

function _bind(fn, ...args) {
  return function() {
    return fn.apply(undefined, args);
  };
}

function _guard(promise, test) {
  let guarded = promise['finally'](function() {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });
  return guarded;
}

function _objectIsAlive(object) {
  return !(get(object, "isDestroyed") || get(object, "isDestroying"));
}

function serializerForAdapter(store, adapter, modelName) {
  let serializer = adapter.serializer;

  if (serializer === undefined) {
    serializer = store.serializerFor(modelName);
  }

  if (serializer === null || serializer === undefined) {
    serializer = {
      extract(store, type, payload) { return payload; }
    };
  }

  return serializer;
}

function validateDocumentStructure(doc) {
  let errors = [];
  if (!doc || typeof doc !== 'object') {
    errors.push('Top level of a JSON API document must be an object');
  } else {
    if (!('data' in doc) &&
        !('errors' in doc) &&
        !('meta' in doc)) {
      errors.push('One or more of the following keys must be present: "data", "errors", "meta".');
    } else {
      if (('data' in doc) && ('errors' in doc)) {
        errors.push('Top level keys "errors" and "data" cannot both be present in a JSON API document');
      }
    }
    if ('data' in doc) {
      if (!(doc.data === null || Array.isArray(doc.data) || typeof doc.data === 'object')) {
        errors.push('data must be null, an object, or an array');
      }
    }
    if ('meta' in doc) {
      if (typeof doc.meta !== 'object') {
        errors.push('meta must be an object');
      }
    }
    if ('errors' in doc) {
      if (!Array.isArray(doc.errors)) {
        errors.push('errors must be an array');
      }
    }
    if ('links' in doc) {
      if (typeof doc.links !== 'object') {
        errors.push('links must be an object');
      }
    }
    if ('jsonapi' in doc) {
      if (typeof doc.jsonapi !== 'object') {
        errors.push('jsonapi must be an object');
      }
    }
    if ('included' in doc) {
      if (typeof doc.included !== 'object') {
        errors.push('included must be an array');
      }
    }
  }

  return errors;
}

function normalizeResponseHelper(serializer, store, modelClass, payload, id, requestType) {
  let normalizedResponse = serializer.normalizeResponse(store, modelClass, payload, id, requestType);
  let validationErrors = [];
  runInDebug(() => {
    validationErrors = validateDocumentStructure(normalizedResponse);
  });

	assert(`normalizeResponse must return a valid JSON API document:\n\t* ${validationErrors.join('\n\t* ')}`, isEmpty(validationErrors));

  return normalizedResponse;
}

function nextParams(model, query, lastQuery) {
	let isJsonApi = false;
	let next = get(model, 'meta.next');
	if (isNone(next)) {
		isJsonApi = true;
		next = get(model, 'links.next');
	}

	if (!isEmpty(next)) {
		if (isJsonApi) {
			let [ , params ] = next.split('?');
			params = params.split('&');
			params.forEach(item => {
				let [ key, value ] = item.split('=');
				if (/\[/.test(key)) {
					let [ key2, key3 ] = key.split('[');
					key3 = key3.replace(/\]$/, '');
					key = key2;
					if (/\d+/.test(key3)) {
						value = [value];
					} else {
						value = {[key3]: value};
					}
				}
				set(query, key, value);
			});
		} else {
			lastQuery.page = (lastQuery.page || 1) + 1;
			merge(query, lastQuery);
		}
		return true;
	}
	return false;
}


//function _findWhereIn(store, modelType, queryList, query) {
//	if (queryList.length === 0) {
//		return resolve([]);
//	}
//
//	// get next query params
//	const params = queryList.shift();
//
//	// merge query params with params
//	merge(params, query);
//
//	// find all models
//	return store.findAll(modelType, params).then((model) => {
//		return _findWhereIn(store, modelType, queryList, query).then((moreModels) => {
//			if (moreModels && !isEmpty(get(moreModels, 'content'))) {
//				return model.pushObjects(get(moreModels, 'content'));
//			}
//			return model;
//		});
//	});
//}
