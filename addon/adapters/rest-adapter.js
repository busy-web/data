/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import Configuration from './../configuration';

/**
 * @class
 * main ember-data adapter
 *
 * @extends DS.RESTAdapter
 */
export default DS.RESTAdapter.extend(
{
	dataService: Ember.inject.service('busy-data'),

	host: Ember.computed(function()
	{
		return this.get('dataService.host');
	}),

	shouldReloadAll: function()
	{
		return true;
	},

	/**
	 * sets the api call headers for the authenticated user
	 *
	 * @private
	 * @method headers
	 */
	headers: Ember.computed('dataService.authKey', function()
	{
		var authUser = this.get('dataService.authKey');
		var headers = null;

		if(authUser && authUser.type === 10)
		{
			headers = {};
			headers[this.get('dataService.publicKeyAuthString')] = authUser.key;
		}
		else if(authUser && authUser.type === 20)
		{
			headers = {};
			headers[this.get('dataService.basicKeyAuthString')] = 'Basic ' + authUser.key;
		}

		return headers;
	}),

	buildURL: function(modelName, id, snapshot, requestType, query)
	{
		var url = this._super(modelName, id, snapshot, requestType, query);

		if(this.get('dataService.shouldSendVersion'))
		{
			url = url + '?' + this.get('dataService.versionUrlParam') + '=' + this.get('dataService.version');
		}

		// set debug flag
		if(this.get('dataService.debug'))
		{
			url = url + '&' + this.get('dataService.debugUrlParam') + '=true';
		}

		if(this.get('dataService.xdebugSession'))
		{
			url = url + '&' + this.get('dataService.xdebug') + '=' + this.get('dataService.xdebugSession');
		}

		return url;
	},

	pathForType: function(type)
	{
		return Ember.String.dasherize(type);
	},

	defaultQuery: function(query)
	{
		query = this.copyQuery(query || {});

		Ember.assert("store.query was called with an id. store.findRecord should be used instead.", typeof query !== 'string');

		if(Ember.isNone(Ember.get(query, 'deleted_on')))
		{
			query.deleted_on = '_-NULL-_';
		}
		else if(Ember.get(query, 'deleted_on') === '_-DISABLE-_')
		{
			delete query.deleted_on;
		}

		return query;
	},

	copyQuery: function(query)
	{
		var nQuery = {};
		for(var key in query)
		{
			if(query.hasOwnProperty(key))
			{
				nQuery[key] = query[key];
			}
		}
		return nQuery;
	},

	query: function(store, type, query)
	{
		query = this.defaultQuery(query);

		return this._super(store, type, query);
	},

	queryRecord: function(store, type, query)
	{
		query = this.defaultQuery(query);

		return this._super(store, type, query);
	},

	rpcQuery: function(store, clientName, type, query)
	{
		var url = this.buildURL(clientName, null, null, 'query', query);

		return this.ajax(url, 'POST', {data: JSON.stringify(query), _batch: false});
	},

//	findAll: function(store, type, sinceToken, model, query)
//	{
//		var _this = this;
//		query = this.defaultQuery(query);
//		query.page_size = query.page_size || 100;
//		query.page = query.page || 1;
//
//		if(sinceToken)
//		{
//			query.updated_on = sinceToken;
//		}
//
//		var url = this.buildURL(type.modelName, null, null, 'findAll');
//
//		return this.ajax(url, 'GET', { data: query }).then(function(data)
//		{
//			var next = data.next;
//
//			if(!Ember.isNone(next) && !Ember.isEmpty(next))
//			{
//				query.page = query.page + 1;
//
//				return _this.findAll(store, type, sinceToken, model, query).then(function(moreData)
//				{
//					if(!Ember.isNone(moreData))
//					{
//						data.data.pushObjects(moreData);
//					}
//
//					return data;
//				});
//			}
//
//			return data;
//		});
//	},

	shouldBackgroundReloadRecord: function(store, snapshot)
	{
		if(snapshot.preventCache)
		{
			return true;
		}

		return true;
	},

	handleResponse: function(status, headers, payload, requestData)
	{
		var result = payload || {};

		if(typeof payload === 'object' && Ember.isNone(payload.success))
		{
			result = payload.result;
		}

		if(typeof result !== 'object')
		{
			result = {
				code: result,
				debug: {
					errors: [result]
				}
			};
		}

		if(status === 401 || (typeof result === 'object' && result.statusCode === 401))
		{
			this.get('dataService').invalidateSession();

			return new DS.AdapterError([{status: 401, details: 'Unathorized'}], "Not Authorized");
		}
		else if(status === 0)
		{
			return new DS.AdapterError([{status: 0, details: "Canceled"}], "Call Aborted");
		}

		if(this.isSuccess(status, headers, result))
		{
			return result;
		}
		else if(this.isInvalid(status, headers, result))
		{
			let errArray = Ember.get(result, 'code');
			if(this.get('dataService.debug'))
			{
				errArray = Ember.get(result, 'debug.errors');
			}
			return new DS.InvalidError(errArray);
		}

		let errors = this.normalizeErrorResponse(status, headers, result);
		let detailedMessage = this.generatedDetailedMessage(status, headers, result, requestData);

		return new DS.AdapterError(errors, detailedMessage);
	},

	normalizeErrorResponse: function(status, headers, payload)
	{
		var err = payload.code;
		if(this.get('dataService.debug') && payload && payload.debug)
		{
			err = payload.debug.errors;
		}

		var errArray = [];
		for(var i in err)
		{
			if(err.hasOwnProperty(i))
			{
				errArray.push({
					status: status,
					title: "The backend responded with an error",
					detail: err[i]
				});
			}
		}

		return errArray;
	},

	/**
	 * Generates a detailed ("friendly") error message, with plenty
	 * of information for debugging (good luck!)
	 * @method generatedDetailedMessage
	 * @private
	 * @param  {Number} status
	 * @param  {Object} headers
	 * @param  {Object} payload
	 * @param  {Object} requestData
	 * @return {String} detailed error message
	 */
	generatedDetailedMessage: function(status, headers, payload, requestData)
	{
		var shortenedPayload;
		var payloadContentType = headers["Content-Type"] || "Empty Content-Type";

		if (payloadContentType === "text/html" && payload.length > 250) {
			shortenedPayload = "[Omitted Lengthy HTML]";
		} else {
			shortenedPayload = JSON.stringify(payload);
		}

		var requestDescription = requestData.method + ' ' + requestData.url;
		var payloadDescription = 'Payload (' + payloadContentType + ')';

		return ['Ember Data Request ' + requestDescription + ' returned a ' + status, payloadDescription, shortenedPayload].join(" - ");
	},

	isSuccess: function(status, headers, payload)
	{
		var success = this._super(status, headers, payload);

		return (success && payload.success);
	},

	/**
	 * Called by the store when a newly created record is
	 * saved via the `save` method on a model record instance.
	 *
	 * The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
	 * to a URL computed by `buildURL`.
	 *
	 * See `serialize` for information on how to customize the serialized form
	 * of a record.
	 *
	 * @method createRecord
	 * @param {DS.Store} store
	 * @param {subclass of DS.Model} type
	 * @param {DS.Snapshot} snapshot
	 * @return {Promise} promise
	*/
	createRecord: function(store, type, snapshot)
	{
		var data = {};
		var serializer = store.serializerFor(type.modelName);
		var url = this.buildURL(type.modelName, null, snapshot, 'createRecord');

		serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

		var options = { data: data };
		if(snapshot.record._batch)
		{
			options._batch = true;
			options._autoBatch = snapshot.record._autoBatch;
		}

		return this.ajax(url, "POST", options);
	},

	/**
	  Called by the store when an existing record is saved
	  via the `save` method on a model record instance.

	  The `updateRecord` method serializes the record and makes an Ajax (HTTP PUT) request
	  to a URL computed by `buildURL`.

	  See `serialize` for information on how to customize the serialized form
	  of a record.

	  @method updateRecord
	  @param {DS.Store} store
	  @param {subclass of DS.Model} type
	  @param {DS.Snapshot} snapshot
	  @return {Promise} promise
	*/
	updateRecord: function(store, type, snapshot)
	{
		var data = {};
		var serializer = store.serializerFor(type.modelName);

		serializer.serializeIntoHash(data, type, snapshot);

		var id = snapshot.id;
		var url = this.buildURL(type.modelName, id, snapshot, 'updateRecord');

		var options = { data: data };
		if(snapshot.record._batch)
		{
			options._batch = true;
			options._autoBatch = snapshot.record._autoBatch;
		}

		return this.ajax(url, "PATCH", options);
	},

	_ajaxRequest: function(options)
	{
		options = options || {};

		var isBatch = (Configuration.BATCH_GET && !options._prevent_batch);
		if(isBatch && options._batch)
		{
			if(options._autoBatch)
			{
				this.get('dataService.autoBatch').send(options);
			}
			else
			{
				this.get('dataService.manualBatch').send(options);
			}
		}
		else if(isBatch && options.type === 'GET')
		{
			this.get('dataService.autoBatch').send(options);
		}
		else
		{
			Ember.$.ajax(options);
		}
	},

	/**
	 * sets up the parameters for the ajax call
	 *
	 * @private
	 * @method ajaxOptions
	 * @param url {string}
	 * @param type {object} model type
	 * @param options {object} data options
	 * @returns {object} ajax call object
	 */
	ajaxOptions: function(url, type, options)
	{
		var hash = options || {};
			hash.url = url;
			hash.type = type;
			hash.dataType = 'json';
			hash.context = this;
			hash.data = hash.data || {};

		// set up the content type and data object
		//
		// if _fileObject is set then set up a file upload
		// else if type is post set up POST content and data object
		// otherwise the data and content are left alone
		if(!Ember.isNone(Ember.get(hash, 'data._fileObject')))
		{
			this.setupUpload(hash);
		}

		// setup special headers like auth
		var headers = Ember.get(this, 'headers');
		if(!Ember.isNone(Ember.get(hash, 'data.auth_header')))
		{
			headers = hash.data.auth_header;
			delete hash.data.auth_header;

			hash._prevent_batch = true;
		}

		if(!Ember.isNone(headers))
		{
			hash.beforeSend = function (request)
			{
				Object.keys(headers).forEach(function(key)
				{
					request.setRequestHeader(key, headers[key]);
				});
			};
		}

		return hash;
	},

	/**
	 * set up the ajax call for a file upload
	 *
	 * @private
	 * @method setupUpload
	 * @param hash {object}
	 * @returns {object}
	 */
	setupUpload: function(hash)
	{
		// gets the fileObject from the hash.data object
		// that was created in the serializer.serializeIntoHash
		// The fileObject has event listeners for uploadStart,
		// uploadProgress and uploadComplete
		var fileObject = hash.data._fileObject;
			fileObject.uploadStart();

		// set the ajax complete function to trigger
		// the fileObject uploadComplete event
		hash.complete = function()
		{
			fileObject.uploadComplete();
		};

		// remove the _fileObject from the hash.data
		// so it doesn't get sent to the api.
		delete hash.data._fileObject;

		// convert the hash.data to a formData object
		hash.data = this.convertDataForUpload(hash.data);

		// set contentType and processData to false
		// for file uploads
		hash.contentType = false;
		hash.processData = false;

		// set the xhr function to report
		// upload progress
		hash.xhr = function()
		{
			var xhr = Ember.$.ajaxSettings.xhr();
			xhr.upload.onprogress = function(e)
			{
				Ember.run.later(this, function()
				{
					fileObject.uploadProgress(e);
				}, 100);
			};

			return xhr;
		};
	},

	/**
	 * converts data object into a formdata object
	 *
	 * @method convertDataForUpload
	 * @param data {object}
	 * @returns {object}
	 */
	convertDataForUpload: function(data)
	{
		var formData = new FormData();

		Ember.$.each(data, function(key, val)
		{
			if(data.hasOwnProperty(key))
			{
				if(key !== 'file_url' && key !== 'file_thumb_url' && key !== 'image_url' && key !== 'image_thumb_url')
				{
					formData.append(key, val);
				}
			}
		});

		return formData;
	}
});
