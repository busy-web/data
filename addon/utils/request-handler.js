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

function objectIsEmpty(obj)
{
	if(Ember.isNone(obj))
	{
		return true;
	}

	let length = 0;
	for(let i in obj) {
		if(obj.hasOwnProperty(i))
		{
			length = length + 1;
		}
	}

	return length === 0;
}

function isJoinAll(type)
{
	return /join/.test(Ember.String.dasherize(type)) && /all/.test(Ember.String.dasherize(type));
}

function isOuterJoin(type)
{
	return /join/.test(Ember.String.dasherize(type)) && /outer/.test(Ember.String.dasherize(type));
}

/**
 * `Util\RequestHandler`
 *
 */
export default Ember.Object.extend(
{
	store: null,

	finishedList: null,

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

	buildJoinTo(operation, parentModel) {
		const type = Ember.get(operation, 'operationType');
		const modelType = Ember.get(operation, 'modelType');
		const joinOn = Ember.get(operation, 'params.joinOn');
		const joinModel = Ember.get(operation, 'params.join');
		const query = Ember.get(operation, 'params.query') || {};
		let alias = Ember.get(operation, 'alias');

		const hasMany = isJoinAll(Ember.String.dasherize(type));
		const isOuter = isOuterJoin(Ember.String.dasherize(type));

		Ember.assert('You must set a model type in the operation object.', !Ember.isNone(modelType));

		const modelKey = Ember.String.underscore(joinOn === 'id' ? joinModel + '-id' : 'id');
		const modelProperty = getParamFromModels(joinOn, parentModel);
		if (Ember.isNone(modelProperty)) {
			return Ember.RSVP.resolve(null);
		}

		return this.store.findWhereIn(modelType, modelKey, modelProperty, query).then(children => {
			let modelName = Ember.String.camelize(modelType);
			modelName = hasMany ? Ember.String.pluralize(modelName) : modelName;

			if (Ember.isNone(alias)) {
				alias = modelName;
			}

			if (!isOuter) {
				if (!Ember.isNone(parentModel.forEach)) {
					let getter = hasMany ? 'filterBy' : 'findBy';
					parentModel.forEach(item => {
						item.set(alias, children[getter].call(children, Ember.String.camelize(modelKey), getModelProperty(item, joinOn)));
					});
					return;
				} else {
					parentModel.set(alias, hasMany ? children : children.objectAt(0));
					return;
				}
			} else {
				return children;
			}
		});
	},

	dispatchCall: function(type, operation, parentModel) {
		return this['build' + Ember.String.classify(type)].call(this, operation, parentModel);
	},

	buildRequest(operations, parents) {
		const requests = {};
		const remove = [];

		operations.forEach(item => {
			const type = Ember.get(item, 'operationType');
			const modelName = Ember.String.camelize(Ember.get(item, 'modelType'));

			let alias = Ember.get(item, 'alias');
			alias = Ember.isNone(alias) ? modelName : alias;

			if (type === 'join' || type === 'joinAll' || type === 'outerJoin' || type === 'outerJoinAll') {
				alias = isJoinAll(type) ? Ember.String.pluralize(alias) : alias;
				const joinTo = Ember.get(item, 'params.join');
				alias = `${alias}-${joinTo}`;

				if (!objectIsEmpty(parents)) {
					const parentPath = this.findParentPath(item);

					if (!Ember.isEmpty(parentPath)) {
						let parentModel = Ember.get(parents, parentPath);

						if (!Ember.isNone(parentModel)) {
							if(!Ember.isNone(Ember.get(parentModel, 'value'))) {
								parentModel = Ember.get(parentModel, 'value');
							}

							if (Ember.get(parentModel, 'isLoaded') === true) {
								requests[alias] = this.dispatchCall(type, item, parentModel);
								remove.pushObject(item);
								this.finishedList.unshiftObject(item);
							}
						}
					}
				}
			} else {
				requests[alias] = this.dispatchCall(type, item);
				remove.pushObject(item);
				this.finishedList.unshiftObject(item);
			}
		});

		operations.removeObjects(remove);

		return Ember.RSVP.hashSettled(requests).then(data => {
			// convert hashSettled data to regular hash data
			const _data = {};
			for (let i in data) {
				if (data.hasOwnProperty(i)) {
					const val =  Ember.get(data[i], 'value');
					if (!Ember.isNone(val)) {
						_data[i.replace(/-[\s\S]*$/, '')] = val;
					}
				}
			}
			return _data;
		});
	},

	findParentPath(operation) {
		var joinName = Ember.get(operation || {}, 'params.join');
		if (Ember.isNone(joinName)) {
			return '';
		}

		var parentPath = '';
		var currJoin = joinName;
		var finished = this.finishedList;
		var isOuter = false;

		for (let key in finished) {
			if (finished.hasOwnProperty(key)) {
				let item = finished[key];
				if (Ember.get(item, 'modelType') === Ember.String.dasherize(currJoin)) {
					let tempName = Ember.String.camelize(Ember.get(item, 'modelType'));
					if (isJoinAll(Ember.get(item, 'operationType'))) {
						tempName = Ember.String.pluralize(tempName);
					}

					parentPath = tempName + '.' + parentPath;
					currJoin = Ember.get(item, 'params.join');
					isOuter = isOuterJoin(Ember.get(item, 'operationType'));
				} else if (Ember.get(item, 'alias') === Ember.String.camelize(currJoin)) {
					parentPath = Ember.get(item, 'alias') + '.' + parentPath;
					currJoin = Ember.get(item, 'params.join');
					isOuter = isOuterJoin(Ember.get(item, 'operationType'));
				}

				// break from the loop if the currJoin is null
				// or we hit an outer join model
				if (Ember.isNone(currJoin) || isOuter) {
					break;
				}
			}
		}

		parentPath = parentPath.replace(/\.$/, '');

		return parentPath;
	}
});
