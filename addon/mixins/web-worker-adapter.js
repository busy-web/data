/**
 * @module Mixins
 *
 */
import $ from 'jquery';
import Mixin from '@ember/object/mixin';
import { isEmpty } from '@ember/utils';
import Query from './../utils/query';

/**
 * WebWorkerMixin
 *
 */
export default Mixin.create({
	workerName: '',

	__worker: null,
	__workerStack: null,
	__contentId: 0,

	__throttleSize: 50,
	__queue: null,

	init() {
		this._super();
		// create the worker instance
		this.setupWorker();
	},

	setupWorker() {
		if (!isEmpty(this.get('workerName'))) {
			this.__queue = [];

			// create a new worker stack map
			this.__workerStack = {};

			// create and save new request worker
			this.__worker = new Worker(this.get('workerName')); // "workers/request.js");

			// on message dispather
			this.__worker.onmessage = (event) => {
				//console.log('onmessage', event.data.workerId);
				// get worker and garbage collect worker stack
				const workerContext = this.__workerStack[event.data.workerId];
				delete this.__workerStack[event.data.workerId];

				dispatchEvent(workerContext, event.data);
			};
		} else {
			throw new Error("web-worker-mixin requires a workerName to be set");
		}
	},

	// fetch(opts) {
	//   this.__queue.push(opts);
	// },

	fetchWithWorker(opts) {
		const hash = getAPIHash(opts);
		//hash.credentials = navigator.credentials;

		// create a new worker id
		const workerId = `worker__${this.__contentId}`;

		// increment worker count
		this.__contentId = this.__contentId + 1;

		//console.log('fetch', workerId);

		// save context hash for success/error callback
		this.__workerStack[workerId] = opts;

		// pass worker id to worker
		hash.workerId = workerId;

		// send request to worker
		this.__worker.postMessage(hash);
	},

	_ajaxRequest(opts) {
		if (opts.type === 'GET') {
			this.fetchWithWorker(opts);
		} else {
			$.ajax(opts);
		}
	}
});

function getAPIHash(opts) {
	let hash = {
		url: opts.url,
		type: opts.type,
		data: Query.stringify(opts.data),
	};
	console.log(opts.url, opts.data);
	//hash.dataType = 'text';
	hash.contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
	//hash.dataType = 'json';
	//hash.jsonp = false;
	//hash.crossDomain = true;
	//hash.xhrFields = { withCredentials: true };

	// let [ host ] = hash.url.split("?");
	// host = host.slice(0, host.lastIndexOf('/'));
	// console.log(host);
	let headers = opts.__headers || this.headersForRequest();
	let reqHeaders = { setRequestHeader(name, val) { this[name] = val } };
	opts.beforeSend(reqHeaders);
	delete reqHeaders.setRequestHeader

	hash.headers = Object.assign({}, headers, reqHeaders);
	return hash;
}

function dispatchEvent(workerContext, data) {
	let { type, xhr } = data;
	xhr.getAllResponseHeaders = function() {
		return this.headers;
	};

	if (type === 'success') {
		//resolve(xhr);
		//console.log('fetch success', xhr);
		workerContext.success(xhr.response, xhr.statusText, xhr);
	} else if (type === 'error') {
		//reject(xhr);
		//console.log('fetch error', xhr);
		workerContext.error(xhr, xhr.status, xhr.error);
	} else {
		//reject({ status: 0, statusText: message, error: message });
		throw new Error(`Unknown worker response type [${type}]`);
	}
}
