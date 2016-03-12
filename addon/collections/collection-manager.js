
import Ember from 'ember';

function getProperty(model, name)
{
	return Ember.get(model, Ember.String.camelize(name));
}

function getParamFromModels(key, parentModel)
{
	var prop = null;
	if(!Ember.isNone(parentModel.forEach))
	{
		prop = [];
		parentModel.forEach(function(item)
		{
			var id = getProperty(item, key);
			if(!Ember.isNone(id) && prop.indexOf(id) === -1)
			{
				prop.push(id);
			}
		});
	}
	else
	{
		var id = getProperty(parentModel, key);
		if(!Ember.isNone(id))
		{
			prop = [id];
		}
	}

	return prop;
}

var RequestHandler = Ember.Object.extend(
{
	store: null,

	buildQuery(operation)
	{
		var modelType = Ember.get(operation, 'modelType');
		var query = Ember.get(operation, 'params.query');

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));
		Ember.assert('You must set a query params for the operation object.', !Ember.isNone(query));

		return this.store.query(modelType, query);
	},

	buildQueryRecord(operation)
	{
		var modelType = Ember.get(operation, 'modelType');
		var query = Ember.get(operation, 'params.query');

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));
		Ember.assert('You must set a query params for the operation object.', !Ember.isNone(query));

		return this.store.queryRecord(modelType, query);
	},

	buildFindAll(operation)
	{
		var modelType = Ember.get(operation, 'modelType');
		var query = Ember.get(operation, 'params.query');

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));
		Ember.assert('You must set a query params for the operation object.', !Ember.isNone(query));

		return this.store.findAll(modelType, query);
	},

	buildFindRecord(operation)
	{
		var modelType = Ember.get(operation, 'modelType');
		var id = Ember.get(operation, 'params.id');

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));
		Ember.assert('You must set an id for the operation object.', !Ember.isNone(id));

		return this.store.findRecord(modelType, id);
	},

	buildFindWhereIn(operation)
	{
		var modelType = Ember.get(operation, 'modelType');
		var key = Ember.get(operation, 'params.key');
		var id = Ember.get(operation, 'params.id');
		var query = Ember.get(operation, 'params.query');

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));
		Ember.assert('You must set a key for the operation object.', !Ember.isNone(key));
		Ember.assert('You must set an id for the operation object.', !Ember.isNone(id));
		Ember.assert('You must set a query params for the operation object.', !Ember.isNone(query));

		return this.store.findWhereIn(modelType, key, id, query);
	},

	buildJoin(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel, false);
	},

	buildJoinAll(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel, true);
	},

	buildJoinTo(operation, parentModel, hasMany)
	{
		var modelType = Ember.get(operation, 'modelType');
		var joinOn = Ember.get(operation, 'params.joinOn');
		var joinModel = Ember.get(operation, 'params.join');
		var query = Ember.get(operation, 'params.query') || {};

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));

		var modelKey = Ember.String.underscore(joinOn === 'id' ? joinModel + '-id' : 'id');
		var modelProperty = getParamFromModels(joinOn, parentModel);
		if(Ember.isNone(modelProperty))
		{
			return Ember.RSVP.resolve(null);
		}

		return this.store.findWhereIn(modelType, modelKey, modelProperty, query).then(function(children)
		{
			var modelName = Ember.String.camelize(modelType);
				modelName = hasMany ? Ember.String.pluralize(modelName) : modelName;

			if(!Ember.isNone(parentModel.forEach))
			{
				let getter = hasMany ? 'filterBy' : 'findBy';
				parentModel.forEach(function(item)
				{
					item.set(modelName, children[getter].call(children, Ember.String.camelize(modelKey), getProperty(item, joinOn)));
				});
			}
			else
			{
				parentModel.set(modelName, hasMany ? children : children.objectAt(0));
			}

			return parentModel;
		});
	},

	dispatchCall: function(type, operation, parentModel)
	{
		return this['build' + Ember.String.classify(type)].call(this, operation, parentModel);
	},

	buildRequest(operations, parents)
	{
		var _this = this;
		var requests = {};
		var remove = [];

		operations.forEach(function(item)
		{
			var type = Ember.get(item, 'operationType');
			var modelName = Ember.String.camelize(Ember.get(item, 'modelType'));

			if(type === 'join' || type === 'joinAll')
			{
				if(!Ember.isNone(parents))
				{
					var parentModel = Ember.get(parents, Ember.String.camelize(Ember.get(item, 'params.join')));
					if(!Ember.isNone(parentModel))
					{
						requests[modelName] = _this.dispatchCall(type, item, parentModel);
					}
					else
					{
						Ember.Error("No parentModel was found for the specified " + type + " [" + modelName + "]");
					}
				}
			}
			else
			{
				requests[modelName] = _this.dispatchCall(type, item);
				remove.push(item);
			}
		});

		operations.removeObjects(remove);
		return Ember.RSVP.hash(requests);
	}
});

var Manager = Ember.Object.extend(
{
	store: null,
	operations: null,

	__collection: null,
	__storedOperations: null,

	query: function(modelType, query)
	{
		query = query || {};

		this.addOperation('query', modelType, {query: query});

		return this;
	},

	queryRecord: function(modelType, query)
	{
		query = query || {};

		this.addOperation('queryRecord', modelType, {query: query});

		return this;
	},

	findAll: function(modelType, query)
	{
		query = query || {};

		this.addOperation('findAll', modelType, {query: query});

		return this;
	},

	findWhereIn: function(modelType, key, id, query)
	{
		query = query || {};

		this.addOperation('findWhereIn', modelType, {key: key, id: id, query: query});

		return this;
	},

	findRecord: function(modelType, id)
	{
		this.addOperation('findRecord', modelType, {id: id});

		return this;
	},

	join: function(modelType, join, joinOn, query)
	{
		this.addOperation('join', modelType, {join: join, joinOn: joinOn, query: query});

		return this;
	},

	joinAll: function(modelType, join, joinOn, query)
	{
		this.addOperation('joinAll', modelType, {join: join, joinOn: joinOn, query: query});

		return this;
	},

	collection: function(collectionType)
	{
		var owner = Ember.getOwner(this);

		var Collection = owner._lookupFactory('collection:' + Ember.String.dasherize(collectionType));

		var collection = Collection.create({
			store: this.store,
			manager: this,
			getter: this,
			content: Ember.A()
		});

		this.__collection = collection;

		return this;
	},

	addOperation: function(type, modelType, params)
	{
		var id = Ember.AppUtils.generateUUID();

		this.operations.pushObject(Ember.Object.create({
			id: id,
			operationType: type,
			modelType: modelType,
			params: params
		}));

		this.__storedOperations.pushObject(Ember.Object.create({
			id: id,
			operationType: type,
			modelType: modelType,
			params: params
		}));
	},

	reloadOperations: function()
	{
		var _this = this;
		this.__storedOperations.forEach(function(item)
		{
			_this.operations.pushObject(Ember.Object.create({
				id: item.get('id'),
				operationType: item.get('operationType'),
				modelType: item.get('modelType'),
				params: item.get('params')
			}));
		});
	},

	update: function()
	{
		this.reloadOperations();

		return this.fetch();
	},

	fetch: function()
	{
		var requester = RequestHandler.create({store: this.store});
		var operations = this.get('operations');

		if(operations.length === 0)
		{
			return this.__collection.model.apply(this.__collection, arguments);
		}
		else
		{
			var _this = this;
			return this.__fetch(requester, operations).then(function(data)
			{
				if(!Ember.isNone(_this.__collection))
				{
					return _this.__collection.populateModels(data);
				}
				else
				{
					return data;
				}
			});
		}
	},

	__fetch: function(req, operations, parents)
	{
		var _this = this;
		var length = operations.get('length');
		if(length === 0)
		{
			return Ember.RSVP.resolve(null);
		}

		return req.buildRequest(operations, parents).then(function(data)
		{
			if(operations.get('length') < length)
			{
				return _this.__fetch(req, operations, data).then(function()
				{
					//data.children = childData;

					return data;
				});
			}

			return data;
		});
	}
});

export default Manager;
