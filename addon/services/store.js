/**
 * @module store
 *
 */
import Ember from 'ember';
import DS from 'ember-data';

/***/
const kPageSize = 100;

/**
 * `Service/Store`
 *
 */
export default DS.Store.extend({
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
			if (this.nextParams(models, nextQuery, _query)) {
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

	nextParams(model, query, lastQuery) {
		let isJsonApi = false;
		let next = model.get('meta.next');
		if (Ember.isNone(next)) {
			isJsonApi = true;
			next = model.get('links.next');
		}

		if (!Ember.isEmpty(next)) {
			if (isJsonApi) {
				let [ , params ] = next.split('?');
				params = params.split('&');
				params.forEach(item => {
					let [ key, value ] = item.split('=');
					if (/\[/.test(key)) {
						let [ key2, key3 ] = key.split('[');
						key3 = key3.replace(/\]$/, '');
						key = key2;
						if (/\d+/.test(key3)) {
							value = [value];
						} else {
							value = {[key3]: value};
						}
					}
					query[key] = value;
				});
			} else {
				lastQuery.page = lastQuery.page + 1;
				Ember.merge(query, lastQuery);
			}
			return true;
		}
		return false;
	},

	findBelongsTo(internalModel, link, relationship) {
		if (relationship && relationship.options && relationship.options.foreignKey) {
			let id;
			if (!relationship.options.referenceKey || relationship.options.referenceKey === 'id') {
				id = internalModel.id;
			} else {
				id = internalModel.__data[relationship.options.referenceKey];
			}

			let _internalModel = new DS.InternalModel(relationship.type, null, this, { [relationship.options.foreignKey]: id });
			_internalModel.query = relationship.options.query;
			_internalModel.foreignKey = relationship.options.foreignKey;
			_internalModel.referenceKey = relationship.options.referenceKey;
			_internalModel.link = link;

      return this._scheduleFetch(_internalModel, relationship.options);
		} else {
			return this._super(internalModel, link, relationship);
		}
  },

	_scheduleFetch(internalModel, options) {
    if (internalModel._loadingPromise) {
      return internalModel._loadingPromise;
    }

    let { id, modelName } = internalModel;
		let resolver;
		if (options && options.foreignKey) {
			id = internalModel.__data[options.foreignKey];
			resolver = Ember.RSVP.defer(`Fetching ${modelName}' with ${options.foreignKey}: ${id}`);
		} else {
			resolver = Ember.RSVP.defer(`Fetching ${modelName}' with id: ${id}`);
		}

    let pendingFetchItem = {
      internalModel,
      resolver,
      options
    };

    let promise = resolver.promise;

    internalModel.loadingData(promise);
    if (this._pendingFetch.size === 0) {
      Ember.run.schedule('afterRender', this, this.flushAllPendingFetches);
    }

    this._pendingFetch.get(modelName).push(pendingFetchItem);

    return promise;
  },

	_flushPendingFetchForType(pendingFetchItems, modelName) {
    let store = this;
    let adapter = store.adapterFor(modelName);
    let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    let totalItems = pendingFetchItems.length;
    let internalModels = new Array(totalItems);
    let seeking = Object.create(null);

		for (let i = 0; i < totalItems; i++) {
			let pendingItem = pendingFetchItems[i];
			let internalModel = pendingItem.internalModel;
			internalModels[i] = internalModel;
			seeking[internalModel.id] = pendingItem;
		}

		function handleFoundRecords(foundInternalModels, expectedInternalModels) {
			// resolve found records
			let found = Object.create(null);
			for (let i = 0, l = foundInternalModels.length; i < l; i++) {
				let internalModel = foundInternalModels[i];
				let pair = seeking[internalModel.id];
				found[internalModel.id] = internalModel;

				if (pair) {
					let resolver = pair.resolver;
					resolver.resolve(internalModel);
				}
			}

			// reject missing records
			let missingInternalModels = [];

			for (let i = 0, l = expectedInternalModels.length; i < l; i++) {
				let internalModel = expectedInternalModels[i];

				if (!found[internalModel.id]) {
					missingInternalModels.push(internalModel);
				}
			}

			if (missingInternalModels.length) {
				Ember.warn('Ember Data expected to find records with the following ids in the adapter response but they were missing: ' + Ember.inspect(missingInternalModels.map(r => r.id)), false, {
					id: 'ds.store.missing-records-from-adapter'
				});
				rejectInternalModels(missingInternalModels);
			}
		}

		function rejectInternalModels(internalModels, error) {
			for (let i = 0, l = internalModels.length; i < l; i++) {
				let internalModel = internalModels[i];
				let pair = seeking[internalModel.id];

				if (pair) {
					pair.resolver.reject(error || new Error(`Expected: '${internalModel}' to be present in the adapter provided payload, but it was not found.`));
				}
			}
		}

		if (shouldCoalesce) {

      // TODO: Improve records => snapshots => records => snapshots
      //
      // We want to provide records to all store methods and snapshots to all
      // adapter methods. To make sure we're doing that we're providing an array
      // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
      // return grouped snapshots instead of grouped records.
      //
      // But since the _findMany() finder is a store method we need to get the
      // records from the grouped snapshots even though the _findMany() finder
      // will once again convert the records to snapshots for adapter.findMany()
      let snapshots = new Array(totalItems);
      for (let i = 0; i < totalItems; i++) {
        snapshots[i] = internalModels[i].createSnapshot();
      }

      let groups = adapter.groupRecordsForFindMany(this, snapshots);

      for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];
        var totalInGroup = groups[i].length;
        var ids = new Array(totalInGroup);
        var groupedInternalModels = new Array(totalInGroup);

				const key = group[0]._internalModel.foreignKey || 'id';
				const query = group[0]._internalModel.query;
        for (var j = 0; j < totalInGroup; j++) {
          var internalModel = group[j]._internalModel;

          groupedInternalModels[j] = internalModel;
					if (internalModel.foreignKey) {
						ids[j] = internalModel.__data[key];
					} else {
						ids[j] = internalModel.id;
					}
        }

        if (totalInGroup > 0) {
					this.findWhereIn(modelName, key, ids, query).then(foundInternalModels => {
						handleFoundRecords(foundInternalModels, groupedInternalModels);
					}).catch(error => {
            rejectInternalModels(groupedInternalModels, error);
					});
        } else {
          Ember.assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
        }
      }
    } else {
			return this._super(pendingFetchItems, modelName);
    }
  },
});
