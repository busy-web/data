/**
 * @module Mixins
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';
import RPCAdapterMixin from './rpc-adapter';
import Query from 'busy-data/utils/query';

/***/
const { get, set, merge, run } = Ember;

const RequestStore = Ember.Object.extend({
	_maxPageSize: 30,
	queue: null,

	init() {
		this._super();
		set(this, 'queue', []);
	},

	size: Ember.computed.alias('queue.length'),

	addRequest(request) {
		get(this, 'queue').pushObject(request);
		return this;
	},

	nextRequest() {
		return get(this, 'queue').shiftObject();
	},

	/**
	 * Creates a checksum hash of the model call that can be compared
	 * with another call to see if the call has been made.
	 *
	 * @public
	 * @method checksum
	 * @param url {string} ajax url string
	 * @param type {string} ajax type string
	 * @param data {object} ajax data object
	 * @return {string} btoa hash
	 */
	checksum(request) {
		Assert.isObject(request);

		// stringify the data
		const dataStr = window.unescape(window.encodeURIComponent(JSON.stringify(request.query)));

		// return a btoa hash of the url + data + type
		return btoa(`${request.hash.url}-${dataStr}-${request.hash.type}`);
	},

	flushPending() {
		//const queue = get(this, 'queue');
		const pending = get(this, 'queue').splice(0);
		const requests = {};
		const responses = {};
		const map = new window.Map();

		let count = 1;
		pending.forEach(item => {
			let name = item.modelName + '-' + count;
			const checksum = this.checksum(item);
			if (!map.get(checksum)) {
				count = count + 1;
				map.set(checksum, name);
				const hash = item.hash;
				const reqOut = {
					url: hash.url,
					data: item.query,
					method: hash.type,
				};
				requests[name] = reqOut;
			} else {
				name = map.get(checksum);
			}

			if (!responses[name]) {
				responses[name] = [];
			}
			responses[name].push(item);
		});

		return { requests, responses };
	}
});

/**
 *
 */
export default Ember.Mixin.create(RPCAdapterMixin, {
	isBatchEnabled: true,

	init() {
		this._super();
		this._requestStore = RequestStore.create({});
	},

	_pushQueue(hash) {
		const request = hash.__batchRequest;
		delete hash.__batchRequest;
		request.hash = hash;
		this._requestStore.addRequest(request);
	},

	_requestFor(params) {
		const request = this._super(...arguments);
		if (!params.disableBatch && params._requestType !== 'rpc') {
			let modelName;
			if (params.type) {
				modelName = params.type.modelName;
			} else if(params.snapshot) {
				let [ name ] = params.url.split('?');
				name = name.slice(1);
				modelName = name;
			}
			set(request, '__modelName', modelName);
			set(request, '__requestType', params.requestType);
			set(request, '__store', params.store);
		} else {
			request.disableBatch = true;
		}
		return request;
	},

	_requestToJQueryAjaxHash(request) {
		let hash = this._super(...arguments);
		if (!request.disableBatch) {
			let requestType = get(request, '__requestType');
			let modelName = get(request, '__modelName');
			let store = get(request, '__store');
			let query = request.data || {};
			let [ url, queryString ] = request.url.split('?');

			merge(query, Query.parse(queryString));

			hash.__batchRequest = { store, url, modelName, requestType, query };
		} else {
			hash.disableBatch = true;
		}
		return hash;
	},

	_ajaxRequest(hash) {
		if (this.get('isBatchEnabled') === true && !hash.disableBatch) {
			if (get(this, '_requestStore.size') === 0) {
				run.schedule('afterRender', this, this._flushPending);
			}
			this._pushQueue(hash);
		} else {
			this._super(hash);
		}
	},

	_flushPending() {
		if (get(this, '_requestStore.size') > 0) {
			const { requests, responses } = this._requestStore.flushPending();
			this.rpcRequest(this.store, 'batch', 'batch-rest', { requests }).then(batch => {
				const results = get(batch, 'data.results');
				if (batch.success && results) {
					Object.keys(results).forEach(key => {
						const resp = results[key];
						const dispatchers = responses[key];
						let status = resp.statusCode;
						let statusCode = resp.status;

						delete resp.status;
						delete resp.statusCode;

						dispatchers.forEach(item => {
							run(null, get(item, 'hash.success'), resp, status, { status, statusCode, getAllResponseHeaders: () => {}});
						});
					});
				}
			});
		//} else {
		//	run.later(null, () => this._flushPending(), 10);
		}
	},
});
