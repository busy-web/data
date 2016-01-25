/**
 * @module store
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import rpc from 'busy-data/adapters/rpc-adapter';

/***/
const kPageSize = 100;

/**
 * `Service/Store`
 *
 */
export default DS.Store.extend(
{
	rpc: rpc,

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

	findWhereIn: function(modelType, key, values, query)
	{
		query = query || {};
		
		Ember.assert('modelType must be of type string in store.findWhereIn()', typeof modelType === 'string');
		Ember.assert('key must be of type string in store.findWhereIn()', typeof key === 'string');
		Ember.assert('values must be an array of strings in store.findWhereIn()', typeof values === 'object');
		Ember.assert('query must be an object in store.findWhereIn()', typeof query === 'object');

		if(values.length === 0)
		{
			return Ember.RSVP.resolve([]);
		}

		var manager = this;
		var sendValues = values.splice(0, this._maxPageSize);

		query._in = {};
		query._in[key] = sendValues;


		return this.findAll(modelType, query).then(function(models)
		{
			if(!Ember.isEmpty(values))
			{
				return manager.findWhereIn(modelType, key, values).then(function(moreModels)
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

	socket: function(modelType, query)
	{
		Ember.assert('a type must be passed to store.socket()', typeof modelType === 'string' && !Ember.isEmpty(modelType));

		var socket = this.container.lookup('util:models.socket');
			socket.store = this;

		if(typeof query === 'string')
		{
			return socket.findRecord(modelType, query);
		}
		else
		{
			return socket.query(modelType, query);
		}
	},

	filter: function(type)
	{
		Ember.assert('a type must be passed to store.filter()', typeof type === 'string' && !Ember.isEmpty(type));

		var filter = this.container.lookup('util:models.filters.' + type);
		
		Ember.assert('A Filter does not exist for ' + type.classify(), !Ember.isNone(filter));

		filter.store = this;

		return filter;
	},

	dispatcher: function(type)
	{
		Ember.assert('a type must be passed to store.dispatcher()', typeof type === 'string' && !Ember.isEmpty(type));

		var dispatcher = this.container.lookup('util:models.dispatchers.' + type);

		Ember.assert('No Dispatcher was found for ' + type.classify(), !Ember.isNone(dispatcher));

		dispatcher.store = this;

		return dispatcher;
	},

	manager: function(managerType)
	{
		var args = Array.prototype.slice.call(arguments, 1);

		var manager = this.container.lookupFactory('util:models.managers.' + managerType);

		Ember.assert('A manager does not exist for ' + managerType.classify(), !Ember.isNone(manager));

		args.unshift(this);

		manager.typeName = managerType;

		return manager.fetch.apply(manager, args);
	},

	exportCSV: function(managerType)
	{
		var args = Array.prototype.slice.call(arguments, 1);

		var _manager = this.container.lookupFactory('util:models.managers.' + managerType);

		Ember.assert('A manager does not exist for ' + managerType.classify(), !Ember.isNone(_manager));

		_manager.typeName = managerType;

		var manager = _manager._create({content: Ember.A()});
			manager.store = this;

		var _this = this;
		return manager._fetch.apply(manager, args).then(function(data)
		{
			// get the csv export util
			var filename = manager.get('filename') || managerType.underscore();
			var exportCSV = _this.container.lookup('util:csv-export');
		
			// get the dataMap for mapping data from this
			// manager to the csv format.
			var dataMap = manager.get('dataMap');
		
			Ember.assert('To export a manager to a csv, the manager must provide a dataMap', !Ember.isNone(dataMap));

			// set the datamap
			exportCSV.setDataMap(dataMap);
			
			// get the data from the ProjectParser and pass it
			// to exportCSV.setData
			exportCSV.setData(data.getSorted());

			// call generate on exportCSV class and pass the file name.
			exportCSV.generate(filename);

			return true;
		});
	},

	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 */
	rpcRequest: function(type, method, params, baseURL)
	{
		var client = this.rpc.create(type);

	//	var authUser = this.get('session.session.authenticated');
	//	if(authUser && authUser.public_key !== undefined)
	//	{
	//		client.set('publicKey', authUser.public_key);
	//	}
	//	else if(authUser && authUser.auth_hash !== undefined)
	//	{
	//		client.set('authUser', authUser.auth_hash);
	//	}

		if(baseURL !== undefined)
		{
			client.set('baseUrl', baseURL);
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

		var client = this.container.lookup('rpc:clients.' + type);
	
		Ember.assert('No RPC Client was found for ' + type.classify(), !Ember.isNone(client));
		
		Ember.set(client, 'clientName', type);
		Ember.set(client, 'store', this);
		
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
				var records;
				
				store._adapterRun(function () {
					let normalizeResponse = serializer.normalizeResponse(store, typeClass, adapterPayload.result, null, 'rpcQuery');

					if(normalizeResponse.meta) {
						store._setMetadataForRpc(typeClass.modelName, normalizeResponse.meta);
					}

					//TODO Optimize
					records = store.push(normalizeResponse);
				});

				recordArray.loadRecords(records);

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
		var factory = this.container.lookupFactory('rpc:models.' + modelName);

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
