/**
 * @module store
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

/***/
const MAX_PAGE_SIZE = 100;
const { isNone, isEmpty, get, set, merge, getWithDefault } = Ember;

function isObject(value) {
	return !isNone(value) && typeof value === 'object' && value.length === undefined;
}

function nextParams(model, query, lastQuery) {
	let isJsonApi = false;
	let next = get(model, 'meta.next');
	if (isNone(next)) {
		isJsonApi = true;
		next = get(model, 'links.next');
	}

	if (!isEmpty(next)) {
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
				set(query, key, value);
			});
		} else {
			lastQuery.page = lastQuery.page + 1;
			merge(query, lastQuery);
		}
		return true;
	}
	return false;
}


function _findWhereIn(store, modelType, queryList, query) {
	if (queryList.length === 0) {
		return Ember.RSVP.resolve([]);
	}

	// get next query params
	const params = queryList.shift();

	// merge query params with params
	merge(params, query);

	// find all models
	return store.findAll(modelType, params).then((model) => {
		return _findWhereIn(store, modelType, queryList, query).then((moreModels) => {
			if (isObject(moreModels) && !isEmpty(get(moreModels, 'content'))) {
				return model.pushObjects(get(moreModels, 'content'));
			}
			return model;
		});
	});
}

/**
 * `StoreFinders`
 *
 * Mixin that adds extra find methods to the store service
 */
export default Ember.Mixin.create({
	_maxPageSize: MAX_PAGE_SIZE,

	findAll(modelType, _query={}) {
		// copy query object
		const query = merge({}, _query);

		if (isNone(get(query, 'limit'))) {
			set(query, 'page_size', getWithDefault(query, 'page_size', this._maxPageSize));
			set(query, 'page', getWithDefault(query, 'page', 1));
		}

		// make query request
		return this.query(modelType, query).then(models => {
			let nextQuery = {};
			if (nextParams(models, nextQuery, query)) {
				return this.findAll(modelType, nextQuery).then(moreModels => {
					if (isObject(moreModels) && !isEmpty(get(moreModels, 'content'))) {
						models.pushObjects(get(moreModels, 'content'));
					}
					return models;
				});
			} else {
				return models;
			}
		});
	},

	findByIds(modelType, ids, query={}) {
		return this.findWhereIn(modelType, 'id', ids, query);
	},

	findWhereIn(modelType, key, values, query={}) {
		Ember.assert('modelType must be of type string in store.findWhereIn()', typeof modelType === 'string');
		Ember.assert('key must be of type string in store.findWhereIn()', typeof key === 'string');
		Ember.assert('values must be an array of strings in store.findWhereIn()', Ember.typeOf(values) === 'array');
		Ember.assert('query must be an object in store.findWhereIn()', typeof query === 'object');

		const _values = values.slice(0);

		const queryList = [];
		while(_values.length) {
			const __values = _values.splice(0, this._maxPageSize);
			if (/^!/.test(key)) {
				queryList.push({ _not_in: { [key]: __values } });
			} else {
				queryList.push({ _in: { [key]: __values } });
			}
		}

		return _findWhereIn(this, modelType, queryList, query);
	},

	/**
	 * Simple rpc request method that does not use the ember-data
	 * model layer.
	 *
	 * @public
	 * @method rpcRequest
	 * @param type {string} The RPC client to call the method
	 * @param method {string} The RPC method on the client
	 * @param params {object} The params to send to the method
	 * @param baseURL {string} Optional, Override url to the rpc client if different from the normal baseURL.
	 * @return {Ember.RSVP.Promise}
	 */
	rpcRequest(type, method, params={}, baseURL='') {
		Assert.funcNumArgs(arguments, 4);
		Assert.isString(type);
		Assert.isString(method);
		Assert.isObject(params);
		Assert.isString(baseURL);

		const adapter = this._instanceCache.get('adapter');

		if (!adapter.rpcRequest) {
			throw new Error("In order to use rpcRequest your must include the rpc-adapter mixin in your adapter");
		} else {
			// call the rpc method and return the promise.
			return adapter.rpcRequest(this, type, method, params, baseURL);
		}
	}
});
