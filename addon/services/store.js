/**
 * @module store
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import Manager from 'busy-data/utils/manager';
import RPCAdapter from 'busy-data/adapters/rpc-adapter';

/***/
const kPageSize = 100;
const { getOwner } = Ember;

/**
 * `Service/Store`
 *
 */
export default DS.Store.extend({
	_maxPageSize: kPageSize,

	findAll(modelType, query={}) {
		query.page_size = query.page_size || this._maxPageSize;
		query.page = query.page || 1;

		const _query = {};
		for(let key in query) {
			if (query.hasOwnProperty(key)) {
				_query[key] = query[key];
			}
		}

		return this.query(modelType, _query).then(models => {
			const next = models.get('meta').next;
			if (!Ember.isNone(next) && !Ember.isEmpty(next)) {
				_query.page = _query.page + 1;

				return this.findAll(modelType, _query).then(moreModels => {
					if (!Ember.isNone(moreModels) && !Ember.isNone(moreModels.get) && !Ember.isEmpty(moreModels.get('content'))) {
						models.pushObjects(moreModels.get('content'));
					}
					return models;
				});
			} else {
				return models;
			}
		});
	},

	queryRecord: function(modelType, query) {
		return this.query(modelType, query).then(data => {
			Ember.assert('queryRecord expects at most one model to be returned', data.get('length') <= 1);
			return data.objectAt(0);
		});
	},

	findRecord(modelType, value) {
		const query = { id: value, deleted_on: '_-DISABLE-_' };
		return this.query(modelType, query).then(models => {
			return models.objectAt(0);
		});
	},

	findWhere(modelType, key, value, query={}) {
		query[key] = value;
		return this.query(modelType, query);
	},

	findByIds(modelType, ids, query={}) {
		query.deleted_on = '_-DISABLE-_';
		return this.findWhereIn(modelType, 'id', ids, query);
	},

	findWhereIn(modelType, keys, values, query={}) {
		// convert string keys into array format
		if (typeof keys === 'string') {
			values = [values];
			keys = [keys];
		}

		Ember.assert('modelType must be of type string in store.findWhereIn()', typeof modelType === 'string');
		Ember.assert('keys must be of type array|strings in store.findWhereIn()', Ember.typeOf(keys) === 'array');
		Ember.assert('values must be an array of strings in store.findWhereIn()', Ember.typeOf(values) === 'array');
		Ember.assert('query must be an object in store.findWhereIn()', typeof query === 'object');

		// copy the array values so not to change
		// the originals.
		const _values = [];
		values.forEach((arr) => {
			_values.push(arr.copy());
		});

		if (_values[0].length === 0) {
			return Ember.RSVP.resolve([]);
		}

		const promise = [];
		// call _findWhereIn
		while (_values[0].length > 0) {
			const _query = {};

			for (let key in query) {
				if (query.hasOwnProperty(key)) {
					_query[key] = query[key];
				}
			}

			keys.forEach((key, idx) => {
				let sendValues;
				if (idx === 0) {
					sendValues = _values[idx].splice(0, this._maxPageSize);
				} else {
					sendValues = _values[idx];
				}
				this.__setupWhereInObject(key, sendValues, _query);
			});

			_query.page = 1;
			_query.page_size = this._maxPageSize;

			promise.push({modelType: modelType, query: _query});
		}

		return this._findWhereIn(promise).then(data => {
			return data;
		});
	},

	_findWhereIn(queryList) {
		if (queryList.length === 0) {
			return Ember.RSVP.resolve([]);
		}

		const params = queryList.shift();
		return this.findAll(params.modelType, params.query).then((model) => {
			return this._findWhereIn(queryList).then((moreModels) => {
				if (!Ember.isEmpty(moreModels)) {
					return model.pushObjects(moreModels.get('content'));
				}
				return model;
			});
		});
	},

	__setupWhereInObject(key, value, query) {
		if (/^!/.test(key)) {
			query._not_in = query._not_in || {};
			query._not_in[key.replace(/^!/, '')] = value;
		} else {
			query._in = query._in || {};
			query._in[key] = value;
		}
	},

	_filterByQuery(models, query) {
		const excludeKeys = ['_in', '_desc', '_asc', '_lte', '_gte', '_lt', '_gt', 'page', 'page_size'];
		for (var key in query) {
			if (query.hasOwnProperty(key) && excludeKeys.indexOf(key) === -1) {
				const property = Ember.String.camelize(key);

				let param = query[key];
				param = param === '_-NULL-_' ? null : param;
				if (param === '!_-NULL-_') {
					models.removeObjects(models.filterBy(property, null));
				} else if (param !== '_-DISABLE-_') {
					models = models.filterBy(property, param);
				}
			}
		}
		return models;
	},

	getter() {
		const owner = Ember.getOwner(this);
		return Manager.create(owner.ownerInjection(), {
			store: this,
			operations: Ember.A(),
			__storedOperations: Ember.A()
		});
	},

	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 */
	rpcRequest(type, method, params, baseURL) {
		const client = RPCAdapter.create(getOwner(this).ownerInjection(), {url: type});
		if (baseURL !== undefined) {
			client.set('baseURL', baseURL);
		}
		return client.call(method, params);
	},

	findRPC(type, method, params={}) {
		const query = {
			method: method,
			params: params,
			id: 'rpc-' + type,
			jsonrpc: '2.0'
		};

    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of ' + Ember.inspect(type), typeof type === 'string');

		const owner = getOwner(this);
		const Client = owner._lookupFactory('rpc:clients.' + type);

		Ember.assert('No RPC Client was found for ' + type.classify(), !Ember.isNone(Client));

		const client = Client.create(owner.ownerInjection(), {
			store: this,
			clientName: type
		});

		Ember.assert('No method exists for the rpc client ' + type.classify() + '.' + method.camelize(), !Ember.isNone(client[method.camelize()]));

		const _typeClass = client[method.camelize()].call(client);

		Ember.assert('No RPC Model was found for ' + type + '/' + method, !Ember.isNone(_typeClass));

		const array = this.recordArrayManager.createAdapterPopulatedRecordArray(_typeClass, query);

		const adapter = this.adapterFor(type);

		Ember.assert("You tried to load a query but you have no adapter (for " + type + '.' + method.camelize() + ")", adapter);
		Ember.assert("You tried to load a query but your adapter does not implement `query`", typeof adapter.query === 'function' || typeof adapter.findQuery === 'function');

		const buildQuery = function(adapter, store, typeClass, query, recordArray) {
			let promise = adapter.rpcQuery(store, type, typeClass, query, recordArray);
			let serializer = adapter.serializer;
			if (serializer === undefined) {
				serializer = store.serializerFor(type);
			}

			if (serializer === null || serializer === undefined) {
				serializer = {
					extract: function (store, type, payload) {
					 	return payload;
					}
				};
			}

			const label = "DS: Handle Adapter#rpcQuery of " + typeClass;

			promise = Ember.RSVP.resolve(promise, label);

			const isAlive = function(object) {
				return !(Ember.get(object, "isDestroyed") || Ember.get(object, "isDestroying"));
			};

			const _bind = function(fn) {
				const args = Array.prototype.slice.call(arguments, 1);
				return function() {
					return fn.apply(undefined, args);
				};
			};

			const _guard = function(promise, test) {
				const guarded = promise['finally'](function() {
					if (!test()) {
						guarded._subscribers.length = 0;
					}
				});
				return guarded;
			};

			promise = _guard(promise, _bind(isAlive, store));

			return promise.then(function (adapterPayload) {
				let records, payload;
				store._adapterRun(function () {
					payload = serializer.normalizeResponse(store, typeClass, adapterPayload, null, 'rpcQuery');
					//TODO Optimize
					records = store.push(payload);
				});
				recordArray.loadRecords(records, payload);
				return recordArray;
			}, null, "DS: Extract payload of rpcQuery " + typeClass);
		};

    return DS.PromiseArray.create({promise: buildQuery(adapter, this, _typeClass, query, array)});
	},

	_setMetadataForRpc(modelName, metadata) {
		Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of ' + Ember.inspect(modelName), typeof modelName === 'string');

		let typeClass;
		if (this.isValidRPC(modelName)) {
			typeClass = this.modelFor(modelName);
		} else {
			typeClass = this.modelFor('rpc.' + modelName);
		}
		Ember.merge(this.typeMapFor(typeClass).metadata, metadata);
	},

	isValidRPC(modelName) {
		return (/^rpc\.[\s\S]*$/.test(modelName) ? true : false);
	},

	rpcModelFor(modelType) {
		Ember.assert('modelType must be an rpc model type to use rpcModelFor', this.isValidRPC(modelType));

		const modelName = modelType.split('.')[1];
		const factory = getOwner(this)._lookupFactory('rpc:models.' + modelName);

		Ember.assert('No RPC Model was found for ' + modelName, !Ember.isNone(factory));

		factory.modelName = 'rpc.' + modelName;
		return factory;
	},

	_hasModelFor(modelName) {
		if (this.isValidRPC(modelName)) {
			return (this.rpcModelFor(modelName) !== undefined);
		} else {
			return this._super(modelName);
		}
	},

	modelFor(modelName) {
		if (modelName === undefined) {
			Ember.warn('undefined modelName');
		}

		if (this.isValidRPC(modelName)) {
			return this.rpcModelFor(modelName);
		} else {
			return this._super(modelName);
		}
	},

	modelFactoryFor(modelName) {
		if(this.isValidRPC(modelName)) {
			return this.rpcModelFor(modelName);
		} else {
			return this._super(modelName);
		}
	},
});
