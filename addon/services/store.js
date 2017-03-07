/**
 * @module store
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import Manager from 'busy-data/utils/manager';
import RpcStoreMixin from 'busy-data/mixins/rpc-store';

/***/
const kPageSize = 100;

/**
 * `Service/Store`
 *
 */
export default DS.Store.extend(RpcStoreMixin, {
	_maxPageSize: kPageSize,

	findAll(modelType, query={}) {
		if (Ember.isNone(Ember.get(query, 'limit'))) {
			query.page_size = query.page_size || this._maxPageSize;
			query.page = query.page || 1;
		}

		const _query = {};
		for(let key in query) {
			if (query.hasOwnProperty(key)) {
				_query[key] = query[key];
			}
		}

		return this.query(modelType, _query).then(models => {
			let nextQuery = {};
			if (this.nextParams(models, nextQuery)) {
				return this.findAll(modelType, nextQuery).then(moreModels => {
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

//	findRecord(modelType, value) {
//		const query = { id: value, deleted_on: '_-DISABLE-_' };
//		return this.query(modelType, query).then(models => {
//			return models.objectAt(0);
//		});
//	},

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

			/* jshint ignore:start */
			keys.forEach((key, idx) => {
				let sendValues;
				if (idx === 0) {
					sendValues = _values[idx].splice(0, this._maxPageSize);
				} else {
					sendValues = _values[idx];
				}
				this.__setupWhereInObject(key, sendValues, _query);
			});
			/* jshint ignore:end */

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

	nextParams(model, query) {
		let next = model.get('meta.next');
		if (Ember.isNone(next)) {
			next = model.get('links.next');
		}

		if (!Ember.isEmpty(next)) {
			let [ , params ] = next.split('?');
			params = params.split('&');
			params.forEach(item => {
				const [ key, value ] = item.split('=');
				query[key] = value;
			});
			return true;
		}
		return false;
	}
});
