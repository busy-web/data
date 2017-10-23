/**
 * @module mixins
 *
 */
import { merge } from '@ember/polyfills';
import $ from 'jquery';
import { isNone } from '@ember/utils';
import { observer, get, set } from '@ember/object';
import { later } from '@ember/runloop';
import { assert } from '@ember/debug';
import { A } from '@ember/array';
import { reject } from 'RSVP';
import Mixin from '@ember/object/mixin';
import DS from 'ember-data';

/**
 * `BusyData/Mixins/BatchAdapter`
 *
 * @class BatchAdapter
 * @namespace BusyData.Mixins
 * @extends Mixin
 */
export default Mixin.create({
	/**
	 * max request size for the batch
	 *
	 * @public
	 * @property maxBatchSize
	 * @type {number}
	 */
	maxBatchSize: 10,

	/**
	 * max wait time in millisecond for the batch to wait for more calls
	 *
	 * this should be small like 5 or 10 miliseconds.
	 *
	 * @public
	 * @property maxBatchWait
	 * @type {number}
	 */
	maxBatchWait: 5,

	/**
	 * toggle property for turning the batch on or off
	 *
	 * @public
	 * @property isBatchEnabled
	 * @type {boolean}
	 */
	isBatchEnabled: true,

	/**
	 * The run queue for waiting calls
	 *
	 * @private
	 * @property queue
	 * @type {array}
	 */
	queue: null,

	/**
	 * Toggle to pause the run loop when it should wait for more calls to come in
	 *
	 * @private
	 * @property waiting
	 * @type {boolean}
	 */
	waiting: false, // wait status

	init() {
		// setup the queue
		this.set('queue', A());
		this._super(...arguments);
	},

	/**
	 * Run loop for sendding and witing to send batch requests
	 *
	 * @private
	 * @method run
	 * @param expired {boolean} default: false - true if the timer is run out
	 */
	run(expired=false) {
		assert('Arg1 or run must be a boolean value', typeof expired === 'boolean');

		// if waiting and the queue is greater or equal to maxBatchSize or the time to wait has expired
		if ((expired && this.get('queue.length') > 0) || (this.get('queue.length') >= this.get('maxBatchSize'))) {
			// get the queue and then clear the queue
			const batch = this.get('queue');
			this.set('queue', A());

			// send current batch results
			this.sendBatch(batch);
		} else if (this.get('queue.length') > 0 && !this.get('waiting')) { // not waiting and a new call has entered the queue
			// set waiting to true
			this.set('waiting', true);

			// set wait to maxBatchWait
			later(this, function() {
				// set waiting to false
				this.set('waiting', false);

				// time expired call run
				this.run(true);
			}, this.get('maxBatchWait'));
		}
	},

	/**
	 * observer triggers the run method when a call is
	 * added to the queue
	 *
	 * @private
	 * @method notifyQueue
	 */
	notifyQueue: observer('queue.[]', function() {
		this.run();
	}),

	/**
	 * strips the baseurl and http info from the url and returns
	 * the model name
	 *
	 * @public
	 * @method getName
	 * @param url {string}
	 * @return {string}
	 */
	getName(url) {
		// strip http and query params
		let name = url.replace(/^https?:\/\/([^?]*)[\s\S]*$/, '$1');

		// strip everything before the last slash
		return name.replace(/[^/]*\/([\s\S]*)/, '$1');
	},

	getData(hash={}) {
		let url = hash.url;
		let data = hash.data || {};
		let [ , query ] = url.split('?');
		if (query && query.length) {
			const params = query.split('&');
			params.forEach(item => {
				const [ key, value ] = item.split('=');
				this.addQueryStringPair(data, key, value);
			});
		}
		return data;
	},

	addQueryStringPair(params, key, value) {
		if (/\[.+\]/.test(key)) { // parse type: `key[subkey]=value`
			let [ normalizeKey, subKey ] = key.split('[');
			subKey = subKey.split(']').join('');
			let obj = get(params, normalizeKey) || {};

			// NOTE:
			// for keys formatted like `key[subkey][]=value`
			// the key will be parsed correctly in that
			// at this part of the code we will have `subkey[]=value`
			// therefore recursively calling addQueryStringPair will parse
			// this in the following `else if` statment
			this.addQueryStringPair(obj, subKey, value);

			// after recursively calling addQueryStringPair
			// then the new obj can be added to the original params
			set(params, normalizeKey, obj);
		} else if (/\[\]$/.test(key)) { // parse type: `key[]=value`
			let normalizeKey = key.substring(key.length - 2, 0);
			let arr = get(params, normalizeKey) || [];
			arr.push(value);
			this.addQueryStringPair(params, normalizeKey, arr);
		} else {
			// normal key pair just add to params
			set(params, key, value);
		}
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
	checksum(url, type, data={}) {
		// stringify the data
		const dataStr = window.unescape(window.encodeURIComponent(JSON.stringify(data)));

		// return a btoa hash of the url + data + type
		return btoa(`${url}-${dataStr}-${type}`);
	},

	/**
	 * Prepares each call stored in the queue to be batched in a
	 * single rpc call to the api.
	 *
	 * @private
	 * @method prepareBatch
	 * @param batch {array}
	 * @return {object} { requests, responses, hashMap }
	 */
	prepareBatch(batch) {
		const requests = {};
		const hashMap = {};
		const responses = [];
		let count = 1;
		batch.forEach(hash => {
			// create a hashkey for this models query so
			// if two identical calls come in the call only gets made once.
			const hashKey = this.checksum(hash.url, hash.type, hash.data);
			if (isNone(hashMap[hashKey])) {
				// get the url type and data for this call
				const url = this.getName(hash.url);
				const data = this.getData(hash);
				const type = hash.type;

				// create the request object.
				const reqObject = { url, method: type, data };

				// add adition app specific params like: version number...
				this.addBatchParams(reqObject);

				// create unique key for model type
				const key = `${url}-${count}`;

				// add the request and set the key on the hashMap
				requests[key] = reqObject;
				hashMap[hashKey] = key;

				count++;
			}

			responses.push({ hash, hashKey });
		});

		return { requests, responses, hashMap };
	},

	addBatchParams(/*request*/) {
		return;
	},

	_requestUrl() {
		const type = { modelName: 'batch' };
		const requestType = 'query';
		const query = {};


		return this.urlForRequest({ type, requestType, query });
	},

	/**
	 * Sends a batch of api calls to the api with and rpc style call
	 *
	 * @private
	 * @method sendBatch
	 * @param batch {array}
	 */
	sendBatch(batch) {
		// get the url
		const url = this._requestUrl();

		// prepare the batched calls
		const req = this.prepareBatch(batch);

		const requestData = { method: 'rpc', url, isBatch: true };

		// set up the rpc data
		const options = {
			data: {
				method: 'batch-rest',
				params: {
					requests: req.requests
				},
				id: 1,
				jsonrpc: '2.0'
			}
		};

		// get options and set callbacks
		const hash = this.ajaxOptions(url, 'POST', options);
		hash.contentType = 'application/json; charset=utf-8';

		const adapter = this;
		hash.success = function(payload, textStatus, jqXHR) {
			payload = payload.result || payload;
			if (payload === '') {
				payload = {};
			}
			payload._type = "BatchAdapter";

      let response = ajaxSuccess(adapter, jqXHR, payload, requestData);
			if (response && response.isAdapterError) {
				reject(response);
			} else {
				adapter.success(response, req, textStatus, jqXHR);
			}
		};

		hash.error = function(jqXHR, textStatus, errorThrown) {
			let responseData = { textStatus, errorThrown };
      let error = ajaxError(adapter, jqXHR, requestData, responseData);
			window.console.error(error);
		};

		// send ajax call
		$.ajax(hash);
	},

	handleResponse(status, headers, payload, requestData) {
		if (requestData.isBatch) {
			payload.__type = "BatchAdapter";
		}
		return this._super(status, headers, payload, requestData);
	},

	/**
	 * Ember _ajaxRequest override to pause calls for the batch to collect
	 * them and send in bulk.
	 *
	 * @private
	 * @method _ajaxRequest
	 * @param hash
	 */
	_ajaxRequest(hash) {
		if (this.get('isBatchEnabled') === true && get(hash, 'disableBatch') !== true) {
			this.get('queue').pushObject(hash);
		} else {
			this._super(...arguments);
		}
	},

	/**
	 * handles the success callback for the ajax response
	 *
	 * @private
	 * @method success
	 * @param response {object}
	 * @param handler {object}
	 * @param textStatus {string}
	 * @param jqXHR {object}
	 */
	success(response, handler, textStatus, jqXHR) {
		const gStatus = get(jqXHR, 'status');
		const gStatusText = get(jqXHR, 'statusText') || textStatus;
		// make sure batch response is good
		if (get(response, 'success') === true) {
			// get the response results
			const results = get(response, 'data.results') || {};
			handler.responses.forEach(item => {
				// get the key from the hashMap and use that
				// to get the data for this items call
				const key = handler.hashMap[item.hashKey];
				const data = get(results, key);
				const status = this.getBatchStatusForModel(data, gStatus);
				const statusText = this.getBatchStatusTextForModel(data, gStatusText);

				// create an xhr response for this model
				const xhr = merge({}, jqXHR);
				xhr.statusText = statusText;
				xhr.status = status;
				xhr.responseText = JSON.stringify(data);
				xhr.responseJSON = data;

				// get the context model to call success or error on.
				const hash = item.hash;
				const context = hash.context;
				if (status === 200) {
					hash.success.call(context, data, 'success', xhr);
				} else {
					hash.error.call(context, xhr, 'error', xhr.statusText);
				}
			});
		} else {
			this.handleError(jqXHR);
		}
	},

	/**
	 * Gets the statusText from a specific call in the batch response
	 *
	 * This method can be ovveridden to provide the statusText for different
	 * object structures.
	 *
	 * @public
	 * @method getBatchStatusTextForModel
	 * @param result {object} a data response from the batch call
	 * @return {string} the statusText
	 */
	getBatchStatusTextForModel(result, defaultValue) {
		return get(result, 'statusText') || defaultValue;
	},

	/**
	 * Gets the status from a specific call in the batch response
	 *
	 * This method can be ovveridden to provide the status for different
	 * object structures.
	 *
	 * @public
	 * @method getBatchStatusForModel
	 * @param result {object} a data response from the batch call
	 * @return {number} the status
	 */
	getBatchStatusForModel(result, defaultValue) {
		return get(result, 'status') || defaultValue;
	},

	/**
	 * handles errors for the batch call itself then throws
	 * an error or invalidates the session if not authorized.
	 *
	 * @private
	 * @method handleError
	 * @param jqXHR {object} api response object
	 * @param textStatus {string} error status string
	 * @param errorThrown {string} error message
	 */
	handleError(jqXHR, textStatus, errorThrown) {
    if (jqXHR.status === 401 && this.get('session.isAuthenticated')) {
      this.get('session').invalidate();
    } else {
			let error;
			if (errorThrown instanceof Error) {
				error = errorThrown;
			} else if (textStatus === 'timeout') {
				error = new DS.TimeoutError();
			} else if (textStatus === 'abort') {
				error = new DS.AbortError();
			} else if (textStatus === 'error') {
				error = new Error(`BATCH ERROR: ${errorThrown}`);
			} else {
				error = new Error(`BATCH ERROR: ${jqXHR.responseText}`);
			}
			throw error;
		}
	}
});

const CLRF = '\u000d\u000a';
function parseResponseHeaders(headersString) {
  let headers = Object.create(null);

  if (!headersString) {
    return headers;
  }

  let headerPairs = headersString.split(CLRF);
  for (let i = 0; i < headerPairs.length; i++) {
    let header = headerPairs[i];
    let j = 0;
    let foundSep = false;

    for (; j < header.length; j++) {
      if (header.charCodeAt(j) === 58 /* ':' */) {
        foundSep = true;
        break;
      }
    }

    if (foundSep === false) {
      continue;
    }

    let field = header.substring(0, j).trim();
    let value = header.substring(j + 1, header.length).trim();

    if (value) {
      headers[field] = value;
    }
  }
  return headers;
}


function ajaxSuccess(adapter, jqXHR, payload, requestData) {
  let response;
  try {
    response = adapter.handleResponse(
      jqXHR.status,
      parseResponseHeaders(jqXHR.getAllResponseHeaders()),
      payload,
      requestData
    );
  } catch (error) {
		return new DS.AdapterError(error);
  }

  return response;
}

function ajaxError(adapter, jqXHR, requestData, responseData) {
  let error;
  if (responseData.errorThrown instanceof Error) {
    error = responseData.errorThrown;
  } else if (responseData.textStatus === 'timeout') {
    error = new DS.TimeoutError();
  } else if (responseData.textStatus === 'abort' || jqXHR.status === 0) {
    error = new DS.AbortError();
  } else {
    try {
      error = adapter.handleResponse(
        jqXHR.status,
        parseResponseHeaders(jqXHR.getAllResponseHeaders()),
        adapter.parseErrorResponse(jqXHR.responseText) || responseData.errorThrown,
        requestData
      );
    } catch (e) {
      error = e;
    }
  }
  return error;
}
