/**
 * @module utils
 *
 */
import Ember from 'ember';
import Helper from 'busy-data/utils/helpers';

const {getModelProperty} = Helper;


/**
 * Private helper method to get an array if ids
 * from the parent model
 *
 * @private
 * @method getParamFromModels
 * @param key {string} the key to be used in finding the properties
 * @param model {DS.Model} 
 * @return {array}
 */
function getParamFromModels(key, model)
{
	var prop = null;
	if(!Ember.isNone(model.forEach))
	{
		prop = [];
		model.forEach(function(item)
		{
			var id = getModelProperty(item, key);
			if(!Ember.isNone(id) && prop.indexOf(id) === -1)
			{
				prop.push(id);
			}
		});
	}
	else
	{
		var id = getModelProperty(model, key);
		if(!Ember.isNone(id))
		{
			prop = [id];
		}
	}

	return prop;
}

/**
 * `Util\RequestHandler`
 *
 */
export default Ember.Object.extend(
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

	buildOuterJoin(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel);
	},

	buildOuterJoinAll(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel);
	},

	buildJoin(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel);
	},

	buildJoinAll(operation, parentModel)
	{
		return this.buildJoinTo(operation, parentModel);
	},

	buildJoinTo(operation, parentModel)
	{
		var type = Ember.get(operation, 'operationType');
		var modelType = Ember.get(operation, 'modelType');
		var joinOn = Ember.get(operation, 'params.joinOn');
		var joinModel = Ember.get(operation, 'params.join');
		var query = Ember.get(operation, 'params.query') || {};

		var hasMany = /all/.test(Ember.String.dasherize(type));
		var isOuter = /outer/.test(Ember.String.dasherize(type));

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

			if(!isOuter)
			{
				if(!Ember.isNone(parentModel.forEach))
				{
					let getter = hasMany ? 'filterBy' : 'findBy';
					parentModel.forEach(function(item)
					{
						item.set(modelName, children[getter].call(children, Ember.String.camelize(modelKey), getModelProperty(item, joinOn)));
					});
				}
				else
				{
					parentModel.set(modelName, hasMany ? children : children.objectAt(0));
				}
			}
			else
			{
				return children;
			}
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

			if(type === 'join' || type === 'joinAll' || type === 'outerJoin' || type === 'outerJoinAll')
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
