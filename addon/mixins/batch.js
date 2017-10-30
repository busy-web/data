/**
 * @module Mixins
 *
 */
import { reject } from 'rsvp';
import $ from 'jquery';
import Mixin from '@ember/object/mixin';
import { alias } from '@ember/object/computed';
import { isEmpty } from '@ember/utils';
import EmberObject, { set, get } from '@ember/object';
import { run } from '@ember/runloop';
import { merge } from '@ember/polyfills';
import { Assert } from 'busy-utils';
import RPCAdapterMixin from '@busybusy/data/mixins/rpc-adapter';
import Query from '@busybusy/data/utils/query';

const RequestStore = EmberObject.extend({
	//_maxPageSize: 30,
	queue: null,

	init() {
		this._super();
		set(this, 'queue', []);
	},

	size: alias('queue.length'),

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
	checksum(url, type, query) {
		// stringify the data
		const dataStr = window.unescape(window.encodeURIComponent(JSON.stringify(query)));

		// return a btoa hash of the url + data + type
		return btoa(`${url}-${dataStr}-${type}`);
	},

	extractDataFromUrl(url, data) {
		let [ baseUrl, queryString ] = url.split('?');
		merge(data, Query.parse(queryString));

		// remove protocol from url
		baseUrl = baseUrl.replace(/^http[s]?:\/\//, '');

		// get model name and id
		const [ , model, id ] = baseUrl.split('/');

		if (!isEmpty(id)) {
			//return [ model, id ].join('/');
			set(data, 'id', id);
		}
		return model;
	},

	flushPending() {
		const pending = get(this, 'queue').splice(0);
		const requests = {};
		const responses = {};
		const map = new window.Map();

		let count = 1;
		pending.forEach(item => {
			// get url data and type from hash
			let params = {};
			let { url, type, data } = item;
			data = data || {};
			url = this.extractDataFromUrl(url, data);
			let name = url + '-' + count;

			// create a checksum hash of the hash data, url, and type
			const checksum = this.checksum(url, type, data);
			if (!map.get(checksum)) {
				count = count + 1;
				map.set(checksum, name);

				merge(params, { url, data, method: type });

				requests[name] = params;
				responses[name] = [item];
			} else {
				name = map.get(checksum);
				responses[name].push(item);
			}
		});

		return { requests, responses };
	}
});

/**
 *
 */
export default Mixin.create(RPCAdapterMixin, {
	isBatchEnabled: true,

	init() {
		this.__tries = 0;
		this._requestStore = RequestStore.create({});

		this._super();
	},

	_pushQueue(hash) {
		this._requestStore.addRequest(hash);
	},

	_requestFor(params) {
		const request = this._super(...arguments);
		if (params.disableBatch || params._requestType === 'rpc') {
			request.disableBatch = true;
		}
		return request;
	},

	_requestToJQueryAjaxHash(request) {
		let hash = this._super(...arguments);
		if (request.disableBatch) {
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
		if (get(this, '_requestStore.size') === 1) {
			this._sendCall();
		} else {
			this._sendBatch();
		}
	},

	_sendCall() {
		const { responses } = this._requestStore.flushPending();
		const key = Object.keys(responses)[0];
		const resp = responses[key][0];

		$.ajax(resp);
	},

	_sendBatch() {
		const { requests, responses } = this._requestStore.flushPending();
		this.rpcRequest(this.store, 'batch', 'batch-rest', { requests }).then(batch => {
			const results = get(batch, 'data.results');
			if (batch.success && results) {
				Object.keys(results).forEach(key => {
					const resp = results[key];
					let status = resp.statusCode;
					let statusCode = resp.status;

					delete resp.status;
					delete resp.statusCode;

					let contentType = 'application/json; charset=utf-8';
					if (typeof resp === 'string') {
						contentType = "content-type: text/plain; charset=UTF-8";
					}

					const jqXHR = {
						status,
						statusText: 'error',
						responseText: statusCode,
						readyState: 4,
						getAllResponseHeaders: () => contentType
					};

					responses[key].forEach(item => {
						if (status >= 200 && status < 300 || status === 304) {
							run(null, get(item, 'success'), resp, status, jqXHR);
						} else {
							run(null, get(item, 'error'), jqXHR, status, statusCode);
						}
					});
				});
			} else {
				return reject(batch);
			}
		});
	}
});
