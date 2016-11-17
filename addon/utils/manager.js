/**
 * @module utils
 *
 */
import Ember from 'ember';
import RequestHandler from 'busy-data/utils/request-handler';
import Helper from 'busy-data/utils/helpers';
import Assert from 'busy-utils/assert';

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

	__lastOperation: null,
	__nestedOperation: null,

	query(modelType, query={}, alias=null) {
		this.addOperation('query', modelType, {query: query}, alias);
		return this;
	},

	queryRecord(modelType, query={}, alias=null) {
		this.addOperation('queryRecord', modelType, {query: query}, alias);
		return this;
	},

	findAll(modelType, query={}, alias=null) {
		this.addOperation('findAll', modelType, {query: query}, alias);
		return this;
	},

	findWhereIn(modelType, key, id, query={}, alias=null) {
		this.addOperation('findWhereIn', modelType, {key: key, id: id, query: query}, alias);
		return this;
	},

	findRecord(modelType, id, alias) {
		this.addOperation('findRecord', modelType, {id: id}, alias);
		return this;
	},

	outerJoin(modelType, join, joinOn, query, alias) {
		this.addOperation('outerJoin', modelType, {join: join, joinOn: joinOn, query: query}, alias);
		return this;
	},

	outerJoinAll(modelType, join, joinOn, query, alias) {
		this.addOperation('outerJoinAll', modelType, {join: join, joinOn: joinOn, query: query}, alias);
		return this;
	},

	join(modelType, join, joinOn, query, alias) {
		this.addOperation('join', modelType, {join: join, joinOn: joinOn, query: query}, alias);
		return this;
	},

	joinAll(modelType, join, joinOn, query, alias) {
		this.addOperation('joinAll', modelType, {join: join, joinOn: joinOn, query: query}, alias);
		return this;
	},

	callJoinFromModel(lastOperation, key) {
		Assert.funcNumArgs(arguments, 2, true);
		Assert.test('You must have a record type to call a `get` join model for that record', !Ember.isNone(lastOperation));

		// get the join data from the last operations model
		const modelName = lastOperation.get('modelType');
		const model = this.store.createRecord(modelName, {});
		const val = model.get(key);

		// throw error if not a valid join object
		Assert.test(`get did not find a valid join param at key [${key}]`, !Ember.isNone(val) && typeof val === 'object' && val._isJoin === true);

		this[val.method].call(this, val.modelType, val.join, val.joinOn, {}, key);
	},

	get(key) {
		Assert.funcNumArgs(arguments, 1, true);

		// get the last operation to join onto
		let lastOperation = this.__lastOperation;

		// call method to add join
		this.callJoinFromModel(lastOperation, key);

		this.__lastOperation = lastOperation;
		return this;
	},

	beginGet(key) {
		Assert.funcNumArgs(arguments, 1, true);

		// get the last operation to join onto
		let lastOperation = this.__lastOperation;

		// call method to add join
		this.callJoinFromModel(lastOperation, key);

		// if no nested create new nested array map
		if (Ember.isNone(this.__nestedOperation)) {
			this.__nestedOperation = [];
		}

		// push the last operation to the nested map
		this.__nestedOperation.push(lastOperation);

		return this;
	},

	endGet() {
		// pop the lastoperation off the nested map
		this.__lastOperation = this.__nestedOperation.pop();

		// if the array is empty set it back to null
		if (Ember.isEmpty(this.__nestedOperation)) {
			this.__nestedOperation = null;
		}

		return this;
	},

	collection(type) {
		const owner = Ember.getOwner(this);
		const Collection = owner._lookupFactory('collection:' + Ember.String.dasherize(type));
		const collection = Collection.create({
			store: this.store,
			manager: this,
			getter: this,
			content: Ember.A()
		});

		this.__collection = collection;

		return this;
	},

	polymorph(type) {
		const owner = Ember.getOwner(this);
		const Polymorph = owner._lookupFactory('polymorph:' + Ember.String.dasherize(type));
		const polymorph = Polymorph.create({
			store: this.store,
			manager: this,
			getter: this,
			id: generateId(),
			_name: type
		});

		this.__polymorph = polymorph;

		return this;
	},

	clearPolymorph() {
		this.__polymorph = null;
		return this;
	},

	addOperation(operationType, modelType, params, alias) {
		const id = generateId();
		const operation = Ember.Object.create({ id, alias, params, operationType, modelType, polymorph: this.__polymorph });

		this.operations.pushObject(operation);
		this.__storedOperations.pushObject(Ember.Object.create({ id, alias, params, operationType, modelType, polymorph: this.__polymorph }));
		this.__lastOperation = operation;
	},

	reloadOperations() {
		this.__storedOperations.forEach(item => {
			this.operations.pushObject(Ember.Object.create({
				id: item.get('id'),
				operationType: item.get('operationType'),
				modelType: item.get('modelType'),
				alias: item.get('alias'),
				params: item.get('params'),
				polymorph: item.get('polymorph')
			}));
		});
	},

	update() {
		this.reloadOperations();
		return this.fetch();
	},

	applyPolymorphs(data) {
		const operations = Ember.get(this, '__storedOperations');
		const dataMap = {};
		operations.forEach(item => {
			const type = item.get('modelType');
			const parentType = item.get('query.join');
			const path = generateModelPath(parentType, type);

			const polymorph = item.get('polymorph');
			if (!Ember.isNone(polymorph)) {
				const model = getModelProperty(data, path);
				setModelProperty(data, path, null);

				const polyName = generateModelPath(parentType, polymorph.get('_name'));
				if (getModelProperty(dataMap, polyName) === undefined) {
					setModelProperty(dataMap, polyName, polymorph);
				}
				setModelProperty(dataMap, generateModelPath(polyName, type), model);
			}
		});

		for (let i in data) {
			if (data.hasOwnProperty(i)) {
				if (data[i] === null) {
					delete data[i];
				}
			}
		}
		return buildDataObject(data, dataMap);
	},

	fetch() {
		const args = arguments;
		const requester = RequestHandler.create({store: this.store, finishedList: Ember.A()});
		const operations = Ember.get(this, 'operations');
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
