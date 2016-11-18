/**
 * @module utils
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

function loadModel(model, modelType, foreignKey, query={}, skipJoinOn=false) {
	let params = Object.keys(query);
	if (!skipJoinOn) {
	 	if (foreignKey !== 'id' && params.length === 0) {
			const id = model.get(foreignKey.camelize());
			if (!Ember.isNone(id)) {
				return model.store.findRecord(modelType, id);
			}
		} else {
			const fk = Ember.String.underscore(model._internalModel.modelName + '-id');
			const id = model.get('id');
			query[fk] = id;
			params.push(fk);
		}
	}

	if (params.length > 0) {
		return model.store.queryRecord(modelType, query);
	} else {
		return Ember.RSVP.resolve(undefined);
	}
}

/**
 * Model join computed property
 *
 */
export default function join(type, options={}) {
	Assert.funcNumArgs(arguments, 2);
	Assert.isString(type);
	Assert.isObject(options);

	let [ modelType, joinOn ] = type.split(':');
	modelType = modelType.dasherize();

	// if no key is provided the type will be used as type + id
	if (!options.skipJoinOn) {
		if (Ember.isEmpty(joinOn)) {
			joinOn = type.camelize() + 'Id';
		}

		// underscore the key for the api.
		joinOn = joinOn.underscore();
	}

	// add join options
	const join = {
		modelType,
		joinOn,
		method: 'join',
		query: options.query || {},
		skipJoinOn: (options.skipJoinOn === true ? true : false),
		autoload: (options.autoload === false ? false : true),
		_isJoin: true,
	};

	// remove join data from options
	delete options.query;
	delete options.autoload;
	delete options.skipJoinOn;

	const meta = {
		type: modelType,
		join,
		options,
		isRelationship: true,
		kind: 'belongsTo',
		key: null
	};

  return Ember.computed({
		get(key) {
			const relationship = this._internalModel._relationships.get(key);
			const record = relationship.getRecord();
			if (join.autoload && !relationship.hasData) {
				loadModel(this, join.modelType, join.joinOn, join.query, join.skipJoinOn).then(model => {
					if (!Ember.isNone(model) && !Ember.isNone(Ember.get(model, 'id'))) {
						this.set(key, model);
					}
				});
			}
			return record;
		},

		set(key, record) {
			if (record === undefined) {
				record = null;
			}

			if (record && record.then) {
				this._internalModel._relationships.get(key).setRecordPromise(record);
			} else if (record) {
				this._internalModel._relationships.get(key).setRecord(record._internalModel);
			} else {
				this._internalModel._relationships.get(key).setRecord(record);
			}

			return this._internalModel._relationships.get(key).getRecord();
		}
	}).meta(meta);
}
