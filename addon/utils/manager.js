/**
 * @module utils
 *
 */
import Ember from 'ember';
import RequestHandler from 'busy-data/utils/request-handler';
import Helper from 'busy-data/utils/helpers';

const {getModelProperty, setModelProperty, generateModelPath, generateId, mergeObject} = Helper;

function buildDataObject(toObject, fromObject)
{
	if(Object.keys(fromObject).length === 0)
	{
		return toObject;
	}

	for(let i in fromObject)
	{
		if(fromObject.hasOwnProperty(i))
		{
			var base = i.split('.');
				base.pop();
				base = base.join('.');
			if(getModelProperty(toObject, base))
			{
				setModelProperty(toObject, i, getModelProperty(fromObject, i));
				delete fromObject[i];
			}
		}
	}

	return buildDataObject(toObject, fromObject);
}

/**
 * `Util\Manager`
 *
 */
export default Ember.Object.extend(
{
	store: null,
	operations: null,

	__collection: null,
	__storedOperations: null,

	query: function(modelType, query, alias)
	{
		query = query || {};

		this.addOperation('query', modelType, {query: query}, alias);

		return this;
	},

	queryRecord: function(modelType, query, alias)
	{
		query = query || {};

		this.addOperation('queryRecord', modelType, {query: query}, alias);

		return this;
	},

	findAll: function(modelType, query, alias)
	{
		query = query || {};

		this.addOperation('findAll', modelType, {query: query}, alias);

		return this;
	},

	findWhereIn: function(modelType, key, id, query, alias)
	{
		query = query || {};

		this.addOperation('findWhereIn', modelType, {key: key, id: id, query: query}, alias);

		return this;
	},

	findRecord: function(modelType, id, alias)
	{
		this.addOperation('findRecord', modelType, {id: id}, alias);

		return this;
	},

	outerJoin: function(modelType, join, joinOn, query, alias)
	{
		this.addOperation('outerJoin', modelType, {join: join, joinOn: joinOn, query: query}, alias);

		return this;
	},

	outerJoinAll: function(modelType, join, joinOn, query, alias)
	{
		this.addOperation('outerJoinAll', modelType, {join: join, joinOn: joinOn, query: query}, alias);

		return this;
	},

	join: function(modelType, join, joinOn, query, alias)
	{
		this.addOperation('join', modelType, {join: join, joinOn: joinOn, query: query}, alias);

		return this;
	},

	joinAll: function(modelType, join, joinOn, query, alias)
	{
		this.addOperation('joinAll', modelType, {join: join, joinOn: joinOn, query: query}, alias);

		return this;
	},

	collection: function(type)
	{
		var owner = Ember.getOwner(this);

		var Collection = owner._lookupFactory('collection:' + Ember.String.dasherize(type));

		var collection = Collection.create({
			store: this.store,
			manager: this,
			getter: this,
			content: Ember.A()
		});

		this.__collection = collection;

		return this;
	},

	polymorph: function(type)
	{
		var owner = Ember.getOwner(this);

		var Polymorph = owner._lookupFactory('polymorph:' + Ember.String.dasherize(type));

		var polymorph = Polymorph.create({
			store: this.store,
			manager: this,
			getter: this,
			id: generateId(),
			_name: type
		});

		this.__polymorph = polymorph;

		return this;
	},

	clearPolymorph: function()
	{
		this.__polymorph = null;

		return this;
	},

	addOperation: function(type, modelType, params, alias)
	{
		var id = generateId();

		this.operations.pushObject(Ember.Object.create({
			id: id,
			operationType: type,
			modelType: modelType,
			alias: alias,
			params: params,
			polymorph: this.__polymorph
		}));

		this.__storedOperations.pushObject(Ember.Object.create({
			id: id,
			operationType: type,
			modelType: modelType,
			alias: alias,
			params: params,
			polymorph: this.__polymorph
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
				alias: item.get('alias'),
				params: item.get('params'),
				polymorph: item.get('polymorph')
			}));
		});
	},

	update: function()
	{
		this.reloadOperations();

		return this.fetch();
	},

	applyPolymorphs: function(data)
	{
		var operations = this.get('__storedOperations');

		var dataMap = {};

		operations.forEach(function(item)
		{
			var type = item.get('modelType');
			var parentType = item.get('query.join');
			var path = generateModelPath(parentType, type);

			var polymorph = item.get('polymorph');
			if(!Ember.isNone(polymorph))
			{
				var model = getModelProperty(data, path);
				setModelProperty(data, path, null);

				var polyName = generateModelPath(parentType, polymorph.get('_name'));
				if(getModelProperty(dataMap, polyName) === undefined)
				{
					setModelProperty(dataMap, polyName, polymorph);
				}

				setModelProperty(dataMap, generateModelPath(polyName, type), model);
			}
		});

		for(let i in data)
		{
			if(data.hasOwnProperty(i))
			{
				if(data[i] === null)
				{
					delete data[i];
				}
			}
		}

		return buildDataObject(data, dataMap);
	},

	fetch() {
		const args = arguments;
		const requester = RequestHandler.create({store: this.store, finishedList: Ember.A()});
		const operations = this.get('operations');
		if (operations.length === 0) {
			return this.__collection.model.apply(this.__collection, args);
		} else {
			return this.__fetch(requester, operations).then(data => {
				const polyData = this.applyPolymorphs(data);
				if (!Ember.isNone(this.__collection)) {
					return this.__collection.populateModels(polyData);
				} else {
					return polyData;
				}
			});
		}
	},

	__fetch(req, operations, parents, tries) {
		parents = parents || {};
		tries = tries || 0;

		const length = operations.get('length');
		if (length === 0 || tries >= 10) {
			return Ember.RSVP.resolve(parents);
		}

		return req.buildRequest(operations, parents).then(data => {
			if (!Ember.isNone(data)) {
				mergeObject(parents, data);
			}
			return this.__fetch(req, operations, parents, ++tries);
		});
	}
});
