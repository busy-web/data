/**
 * @module adapters
 *
 */
import Ember from 'ember';
import DS from 'ember-data';
import Configuration from './../configuration';
import Batch from './batch-adapter';

/**
 * EmptyObject Class
 *
 * creates an empty object class
 */
function EmptyObject()
{
}

/**
 * Parses a response header.
 *
 */
function _parseResponseHeaders(headerStr) 
{
	var headers = new EmptyObject();
	if (!headerStr) {
		return headers;
	}

	var headerPairs = headerStr.split('\u000d\u000a');
	for (var i = 0; i < headerPairs.length; i++) {
		var headerPair = headerPairs[i];
		// Can't use split() here because it does the wrong thing
		// if the header value has the string ": " in it.
		var index = headerPair.indexOf('\u003a\u0020');
		if (index > 0) {
			var key = headerPair.substring(0, index);
			var val = headerPair.substring(index + 2);
			headers[key] = val;
		}
	}

	return headers;
}

/**
 * @class
 * main ember-data adapter
 *
 * @extends DS.RESTAdapter
 */
export default DS.RESTAdapter.extend(
{
	dataService: Ember.inject.service('busy-data'),

	manualBatch: null,
	autoBatch: null,
	
	init: function()
	{
		this._super();

		this.manualBatch = Batch.create({container: this.container});
		this.autoBatch = Batch.create({container: this.container, maxSize: 20, interval: 5});
	},

	host: function()
	{
		return this.get('dataService.host');
	}.property(),

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
	headers: function()
	{
		var authUser = this.get('dataService.authKey');
		var headers = null;

		if(authUser.type === 10)
		{
			headers['Key-Authorization'] = authUser.key;
		}
		else if(authUser.type === 20)
		{
			headers['Authorization'] = 'Basic ' + authUser.key;
		}

		return headers;
	}.property('dataService.authKey'),

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

		return url;
	},

	pathForType: function(type)
	{
		return Ember.String.dasherize(type);
	},

	defaultQuery: function(query)
	{
		query = query || {};

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

	handleResponse: function(status, headers, payload)
	{
		var result = payload;
		if(Ember.isNone(payload.success))
		{
			result = payload.result;
		}

		if(this.isSuccess(status, headers, result)) 
		{
			return payload;
		}
		else if(this.isInvalid(status, headers, result)) 
		{
			return new DS.InvalidError(result.code);
		}

		var errors = this.normalizeErrorResponse(status, headers, result);

		return new DS.AdapterError(errors);
	},

	isSuccess: function(status, headers, payload)
	{
		var success = this._super(status, headers, payload);

		success = (success && payload.success);
		
		if(status === 401 || (typeof payload === 'object' && payload.statusCode === 401))
		{
			this.get('dataService').invalidateSession();

			success = false;
		}
		
		return success;
	},

	isInvalid: function(status, headers, payload)
	{
		var error = this._super(status, headers, payload);
		
		error = (error || (payload && !payload.success));

		if(this.get('dataService.debug') && payload && payload.debug)
		{
			Ember.Logger.warn("DEBUG API CALL FAILED: ", payload.debug);
		}

		if(status === 401 || (typeof payload === 'object' && payload.statusCode === 401))
		{
			this.get('dataService').invalidateSession();

			error = true;
		}
		
		return error;
	},

	/**
	  Called by the store when a newly created record is
	  saved via the `save` method on a model record instance.

	  The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
	  to a URL computed by `buildURL`.

	  See `serialize` for information on how to customize the serialized form
	  of a record.

	  @method createRecord
	  @param {DS.Store} store
	  @param {subclass of DS.Model} type
	  @param {DS.Snapshot} snapshot
	  @return {Promise} promise
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

		return this.ajax(url, "PUT", options);
	},

	ajax: function(url, type, options)
	{
		var isBatch = Configuration.batchGET;
		if(options && options.data && options.data.auth_header)
		{
			isBatch = false;
		}

		if(type === "GET" && isBatch)
		{
			return this._ajax(url, type, options, true, false);
		}
		else if(options && options._batch)
		{
			return this._ajax(url, type, options, true, !options._autoBatch);
		}
		else
		{
			return this._ajax(url, type, options, false, false);
		}
	},

	_ajax: function(url, type, options, isBatch, isManual)
	{
		var adapter = this;
		var key = 'DS: RESTAdapter#ajax ' + type + ' to ' + url;

		return new Ember.RSVP.Promise(function(resolve, reject)
		{
			var hash = adapter.ajaxOptions(url, type, options);

			hash.success = function (payload, textStatus, jqXHR) 
			{
				var response;
				if (!(response instanceof DS.AdapterError)) 
				{
					response = adapter.handleResponse(jqXHR.status, _parseResponseHeaders(jqXHR.getAllResponseHeaders()), response || payload);
				}

				if (response instanceof DS.AdapterError) 
				{
					Ember.run(null, reject, response);
				}
				else 
				{
					Ember.run(null, resolve, response);
				}
			};

			hash.error = function (jqXHR, textStatus, errorThrown) 
			{
				var error;

				if (!(error instanceof Error)) 
				{
					if (errorThrown instanceof Error) 
					{
						error = errorThrown;
					}
					else if (textStatus === 'timeout') 
					{
						error = new DS.TimeoutError();
					}
					else if (textStatus === 'abort') 
					{
						error = new DS.AbortError();
					}
					else 
					{
						var headers = _parseResponseHeaders(jqXHR.getAllResponseHeaders());
						error = adapter.handleResponse(jqXHR.status, headers, adapter.parseErrorResponse(jqXHR.responseText) || errorThrown);
					}
				}
			
				Ember.run(null, reject, error);
			};

			if(isBatch && isManual)
			{
				adapter.manualBatch.send(hash);
			}
			else if(isBatch)
			{
				adapter.autoBatch.send(hash);
			}
			else
			{
				Ember.$.ajax(hash);
			}
		}, key);
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

		// Convert all PUT methods to PATCH
		if(hash.type === "PUT")
		{
			hash.type = "PATCH";
		}

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
		}

		if(!Ember.isNone(headers))
		{
			hash.beforeSend = function (request)
			{
				Ember.ArrayPolyfills.forEach.call(Ember.keys(headers), function(key)
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
