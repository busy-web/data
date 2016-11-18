/**
 * @module utils
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

function isArrayLike(obj) {
	if (!obj || obj.setInterval) { return false; }
	if (Array.isArray(obj)) { return true; }
	if (Ember.Array.detect(obj)) { return true; }

	let type = Ember.typeOf(obj);
	if ('array' === type) { return true; }
	if ((obj.length !== undefined) && 'object' === type) { return true; }
	return false;
}

/**
 * Model join computed property
 *
 */
export default function joinAll(type, options={}) {
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
		method: 'joinAll',
		query: options.query || {},
		autoload: (options.autoload === true ? true : false),
		_isJoin: true,
	};

	// remove join data from options
	delete options.query;
	delete options.autoload;

	const meta = {
		type: modelType,
		join,
		options,
		isRelationship: true,
		kind: 'hasMany',
		key: null
	};

  return Ember.computed({
		get(key) {
			const relationship = this._internalModel._relationships.get(key);
			const record = relationship.getRecords();
			if (join.autoload && !relationship.hasData) {
				let name, value;
				if (join.joinOn === 'id') {
					name = Ember.String.underscore(this._internalModel.modelName + '-id');
					value = this.get('id');
				} else {
					name = join.joinOn;
					value = this.get(join.joinOn.camelize());
				}

				if (!Ember.isNone(name) && !Ember.isNone(value)) {
					const query = join.query;
					query[name] = value;
					this.store.query(join.modelType, query).then(model => this.set(key, model.toArray()));
				}
			}
			return record;
		},

		set(key, records) {
			Assert.test(`You must pass an array of records to set joinAll relationship`, isArrayLike(records));
			Assert.test(`All elements of joinAll must be instance of DS.Model, you passed ${Ember.inspect(records)}`, (function() {
				return Ember.A(records).every(record => record.hasOwnProperty('_internalModel') === true);
			})());

			const relationship = this._internalModel._relationships.get(key);
			relationship.clear();
			relationship.addRecords(Ember.A(records).mapBy('_internalModel'));
			return relationship.getRecords();
		}
	}).meta(meta);
}
