/**
 * @module mixins
 *
 */
import Ember from 'ember';
import Assert from 'busy-utils/assert';
import UUID from 'busy-utils/uuid';

/**
 * `BusyData/Mixins/BatchAdapter`
 *
 * @class BatchAdapter
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({
	maxBatchSize: 10, // requests
	maxBatchWait: 5, // miliseconds

	queue: null,
	waiting: false,

	init() {
		this._super(...arguments);
		this.set('queue', Ember.A());
	},

	run() {
		if (this.get('queue.length') >= this.get('maxBatchSize')) {
			const batch = this.get('queue');
			this.set('queue', Ember.A());
			this.set('waiting', false);
			this.sendBatch(batch);
		}

		Ember.run.later(this, function() {
			this.run();
		}, this.get('maxBatchWait'));
	},

	notifyQueue: Ember.observer('queue.[]', function() {
		if (!this.get('waiting')) {
			this.set('waiting', true);
			this.run();
		}
	}),

	getName(url){
		let name = url.replace(/^https?:\/\/([^\?]*)[\s\S]*$/, '$1');
		name = name.replace(/[^\/]*\/([\s\S]*)/, '$1');
		return name;
	},

	checksum(hash) {
		let dataCheck = hash.url;
		if (hash.data !== undefined) {
			dataCheck += '-' + JSON.stringify(hash.data);
		}
		dataCheck += '-' + hash.type;
		return btoa(dataCheck);
	},

	prepareBatch(batch) {
		Assert.funcNumArgs(arguments, 1, true);
		Assert.isArray(batch);

		const requests = {};
		const responses = [];
		batch.forEach(hash => {
			const hashKey = this.checksum(hash);
			const urlName = this.getName(hash.url);
			const hashName = UUID.generate();

			if (Ember.isNone(requests[hashKey])) {
				const reqObject = {
					method: hash.type,
					data: hash.data,
					url: urlName,
					_version: this.get('version')
				};

				if (this.get('debug')) {
					reqObject._debug = true;
				}

				requests[hashKey] = reqObject;
			}

			const hashObject = { hash, hashKey, urlName, hashName };
			responses.push(hashObject);
		});

		return { requests, responses };
	},

	sendBatch(batch) {
		const url = this.buildURL('batch');
		const req = this.prepareBatch(batch);

		const request = {};
		request.method = 'batch-rest';
		request.params = req.requests;
		request.id = 1;
		request.jsonrpc = '2.0';

		const hash = this.ajaxOptions(url, 'POST', request);
		hash.data = JSON.stringify(request);
		//hash.type = "POST";
		hash.dataType = "json";

		var _this = this;
		hash.success = function(result, textStatus, jqXHR) {
			return _this.success(result.result, req.responses, jqXHR);
		};

		hash.error = function() {
			return _this.error.apply(_this, arguments);
		};

		Ember.$.ajax(hash);
	},

	_ajaxRequest(hash) {
		this.get('queue').pushObject(hash);

		if (this.get('queue.length') >= this.get('maxBatchSize')) {
			this.sendBatch();
		}
	},

	dispatchResponse(key, response, responseHandlers, jqXHR) {
		if (responseHandlers[key] !== undefined) {
			// get this response's handlers
			const handlers = responseHandlers[key];
			Ember.$.each(handlers, (index, handler) => {
				if (handlers.hasOwnProperty(index)) {
					const textStatus = response.success ? 'success' : 'error';
					handler.hash.success.call(handler.hash.context, response, textStatus, jqXHR);
				}
			});
		} else {
			// key not found
			Ember.warn('There was a propblem calling the success method for [' + key + ']');
		}
	},

	success(response, responseHandlers, jqXHR) {
		if (response.success) {
			// dispatch each respsonse
			const results = response.data.results;
			Ember.$.each(results, (key, val) => {
				if (results.hasOwnProperty(key)) {
					this.dispatchResponse(key, val, responseHandlers, jqXHR);
				}
			});
		} else {
			Ember.Logger.error('error', response);
		}
	},

	error(err) {
		if (err.status === 401) {
			this.get('dataService').invalidateSession();
		} else {
			Ember.Logger.error('error', err);
		}
	}
});
