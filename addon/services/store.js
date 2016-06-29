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
export default DS.Store.extend(
{
	_maxPageSize: kPageSize,

	generateUUID: function()
	{
		return window.uuid.v4();
	},

	findAll: function(modelType, query)
	{
		var manager = this;
			query = query || {};
			query.page_size = query.page_size || this._maxPageSize;
			query.page = query.page || 1;

		return this.query(modelType, query).then(function(models)
		{
			var next = models.get('meta').next;

			if(!Ember.isNone(next) && !Ember.isEmpty(next))
			{
				query.page = query.page + 1;

				return manager.findAll(modelType, query).then(function(moreModels)
				{
					if(!Ember.isNone(moreModels) && !Ember.isNone(moreModels.get) && !Ember.isEmpty(moreModels.get('content')))
					{
						models.pushObjects(moreModels.get('content'));
					}

					return models;
				});
			}
			else
			{
				return models;
			}
		});
	},

	queryRecord: function(modelType, query)
	{
		return this.query(modelType, query).then(function(data)
		{
			Ember.assert('queryRecord expects at most one model to be returned', data.get('length') <= 1);

			return data.objectAt(0);
		});
	},

	findRecord: function(modelType, value)
	{
		var query = {};
			query.id = value;
			query.deleted_on = '_-DISABLE-_';

		return this.query(modelType, query).then(function(models)
		{
			return models.objectAt(0);
		});
	},

	findWhere: function(modelType, key, value, query)
	{
		query = query || {};
		query[key] = value;

		return this.query(modelType, query);
	},

	findByIds: function(modelType, ids, query)
	{
		query = query || {};
		query.deleted_on = '_-DISABLE-_';

		return this.findWhereIn(modelType, 'id', ids, query);
	},

	findWhereIn(modelType, keys, values, query)
	{
		// convert string keys into array format
		if(typeof keys === 'string')
		{
			values = [values];
			keys = [keys];
		}

		// set query if it was not passed in
		query = query || {};
		const _values = [];

		// copy the array values so not to change
		// the originals.
		values.forEach((arr) => {
			_values.push(arr.copy());
		});

		// call _findWhereIn
		return this._findWhereIn(modelType, keys, _values, query);
	},

	_findWhereIn: function(modelType, keys, values, query)
	{
		Ember.assert('modelType must be of type string in store.findWhereIn()', typeof modelType === 'string');
		Ember.assert('keys must be of type array|strings in store.findWhereIn()', Ember.typeOf(keys) === 'array');
		Ember.assert('values must be an array of strings in store.findWhereIn()', Ember.typeOf(values) === 'array');
		Ember.assert('query must be an object in store.findWhereIn()', typeof query === 'object');

		const manager = this;

		if(!/^!/.test(keys[0]) && values[0].length === 0)
		{
			return Ember.RSVP.resolve([]);
		}

		keys.forEach((key, idx) => {
			let sendValues;
			if(idx === 0) {
				sendValues = values[idx].splice(0, this._maxPageSize);
			} else {
				sendValues = values[idx];
			}

			this.__setupWhereInObject(key, sendValues, query);
		});

		query.page = 1;
		query.page_size = this._maxPageSize;

		return this.findAll(modelType, query).then(function(models)
		{
			if(values[0].length > 0)
			{
				return manager.findWhereIn(modelType, keys, values, query).then(function(moreModels)
				{
					if(!Ember.isNone(moreModels) && !Ember.isNone(moreModels.get) && !Ember.isEmpty(moreModels.get('content')))
					{
						models.pushObjects(moreModels.get('content'));
					}

					return models;
				});
			}
			else
			{
				return models;
			}
		});
	},

	__setupWhereInObject(key, value, query)
	{
		if(/^!/.test(key))
		{
			query._not_in = query._not_in || {};
			query._not_in[key.replace(/^!/, '')] = value;
		}
		else
		{
			query._in = query._in || {};
			query._in[key] = value;
		}
	},

	_filterByQuery: function(models, query)
	{
		var excludeKeys = ['_in', '_desc', '_asc', '_lte', '_gte', '_lt', '_gt', 'page', 'page_size'];

		for(var key in query)
		{
			if(query.hasOwnProperty(key) && excludeKeys.indexOf(key) === -1)
			{
				var property = Ember.String.camelize(key);
				var param = query[key];
					param = param === '_-NULL-_' ? null : param;

				if(param === '!_-NULL-_')
				{
					var removeModels = models.filterBy(property, null);
					models.removeObjects(removeModels);
				}
				else if(param !== '_-DISABLE-_')
				{
					models = models.filterBy(property, param);
				}
			}
		}

		return models;
	},

	getter: function()
	{
		var owner = Ember.getOwner(this);

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
	rpcRequest: function(type, method, params, baseURL)
	{
		var client = RPCAdapter.create(getOwner(this).ownerInjection(), {url: type});

		if(baseURL !== undefined)
		{
			client.set('baseURL', baseURL);
		}

		return client.call(method, params);
	},

	findRPC: function(type, method, params)
	{
		params = params || {};

		var query = {
			method: method,
			params: params,
			id: 'rpc-' + type,
			jsonrpc: '2.0'
		};

        Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of ' + Ember.inspect(type), typeof type === 'string');

		var owner = getOwner(this);
		var Client = owner._lookupFactory('rpc:clients.' + type);

		Ember.assert('No RPC Client was found for ' + type.classify(), !Ember.isNone(Client));

		var client = Client.create(owner.ownerInjection(), {
			store: this,
			clientName: type
		});

		Ember.assert('No method exists for the rpc client ' + type.classify() + '.' + method.camelize(), !Ember.isNone(client[method.camelize()]));

		var _typeClass = client[method.camelize()].call(client);

		Ember.assert('No RPC Model was found for ' + type + '/' + method, !Ember.isNone(_typeClass));

        var array = this.recordArrayManager.createAdapterPopulatedRecordArray(_typeClass, query);

        var adapter = this.adapterFor(type);

        Ember.assert("You tried to load a query but you have no adapter (for " + type + '.' + method.camelize() + ")", adapter);
        Ember.assert("You tried to load a query but your adapter does not implement `query`", typeof adapter.query === 'function' || typeof adapter.findQuery === 'function');

		var buildQuery = function(adapter, store, typeClass, query, recordArray)
		{
			var promise = adapter.rpcQuery(store, type, typeClass, query, recordArray);

			var serializer = adapter.serializer;

			if (serializer === undefined)
			{
				serializer = store.serializerFor(type);
			}

			if (serializer === null || serializer === undefined)
			{
				serializer = {
					extract: function (store, type, payload) {
					 	return payload;
					}
				};
			}

			var label = "DS: Handle Adapter#rpcQuery of " + typeClass;

			promise = Ember.RSVP.resolve(promise, label);

			var isAlive = function(object)
			{
				return !(Ember.get(object, "isDestroyed") || Ember.get(object, "isDestroying"));
			};

			var _bind = function(fn)
			{
				var args = Array.prototype.slice.call(arguments, 1);

				return function() {
					return fn.apply(undefined, args);
				};
			};

			var _guard = function(promise, test)
			{
				var guarded = promise['finally'](function() {
					if (!test()) {
						guarded._subscribers.length = 0;
					}
				});

				return guarded;
			};

			promise = _guard(promise, _bind(isAlive, store));

			return promise.then(function (adapterPayload) {
				var records, payload;

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

	_setMetadataForRpc: function(modelName, metadata)
	{
		Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of ' + Ember.inspect(modelName), typeof modelName === 'string');

		var typeClass;
		if(this.isValidRPC(modelName))
		{
			typeClass = this.modelFor(modelName);
		}
		else
		{
			typeClass = this.modelFor('rpc.' + modelName);
		}

		Ember.merge(this.typeMapFor(typeClass).metadata, metadata);
	},

	isValidRPC: function(modelName)
	{
		return (/^rpc\.[\s\S]*$/.test(modelName) ? true : false);
	},

	rpcModelFor: function(modelType)
	{
		Ember.assert('modelType must be an rpc model type to use rpcModelFor', this.isValidRPC(modelType));

		var modelName = modelType.split('.')[1];
		var factory = getOwner(this)._lookupFactory('rpc:models.' + modelName);

		Ember.assert('No RPC Model was found for ' + modelName, !Ember.isNone(factory));

		factory.modelName = 'rpc.' + modelName;

		return factory;
	},

	_hasModelFor: function(modelName)
	{
		if(this.isValidRPC(modelName))
		{
			return (this.rpcModelFor(modelName) !== undefined);
		}
		else
		{
			return this._super(modelName);
		}
	},

	modelFor: function (modelName)
	{
		if(modelName === undefined)
		{
			Ember.warn('undefined modelName');
		}

		if(this.isValidRPC(modelName))
		{
			return this.rpcModelFor(modelName);
		}
		else
		{
			return this._super(modelName);
		}
	},

	modelFactoryFor: function(modelName)
	{
		if(this.isValidRPC(modelName))
		{
			return this.rpcModelFor(modelName);
		}
		else
		{
			return this._super(modelName);
		}
	},
});
