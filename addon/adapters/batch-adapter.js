/**
 * @module library
 *
 */
import Ember from 'ember';
import rpc from './rpc-adapter';
import Configuration from './../configuration';

const Ember$ = Ember.$;

export default Ember.Object.extend(
{
	session: Ember.inject.service('session'),

	publicKey: null,
	authUser: null,

	requests: null,
	response: null,
	hashMap: null,
	length: 0,

	maxSize: 0,
	interval: 0,

	init: function()
	{
		this._super();

		this.set('requests', {});
		this.set('response', {});
		this.set('hashMap', {});

		if(this.get('interval') > 0)
		{
			this._send();
		}
	},

	send: function(hash)
	{
		// create a checksum of the hash
		var hashKey = this.checksum(hash);

		// get the name of the controller from the url
		var urlName = this.getName(hash.url);
	
		// get the current length of our requests and add one
		var length = this.get('length') + 1;
		this.set('length', length);

		// set the name in the hashMap if it hasn't been created.
		if(Ember.isNone(this.get('hashMap')[hashKey]))
		{
			this.get('hashMap')[hashKey] = urlName + '-' + length;
		}

		// unique name for the request and response maps
		var hashName = this.get('hashMap')[hashKey];

		// create an internal data object 
		// that has all the needed references
		var hashData = {
			hashKey: hashKey,
			hashName: hashName,
			urlName: urlName, 
			hash: hash
		};

		// set the requests if not set by another request
		if(Ember.isNone(this.get('requests')[hashName]))
		{
			this.get('requests')[hashName] = hashData;
		}

		// create a response array if not set by another 
		// request
		if(Ember.isNone(this.get('response')[hashName]))
		{
			this.get('response')[hashName] = [];
		}
		
		// add the response to the response hash array
		this.get('response')[hashName].push(hashData);

		// 40 is set to an absolute max for batch calls.
		if(length >= 40 || (this.get('maxSize') > 0 && length > this.get('maxSize')))
		{
			this.commit();
		}
	},

	getName: function(url)
	{
		var name = url.replace(/^https?:\/\/([^\?]*)[\s\S]*$/, '$1');
			name = name.replace(/[^\/]*\/([\s\S]*)/, '$1');

		return name;
	},

	checksum: function(hash)
	{
		var dataCheck = hash.url;

		if(hash.data !== undefined)
		{
			dataCheck += '-' + JSON.stringify(hash.data);
		}
			
		dataCheck += '-' + hash.type;

		return btoa(dataCheck);
	},

	prepareRequests: function(requests)
	{
		var req = {};

		Ember$.each(requests, function(key, val)
		{
			if(requests.hasOwnProperty(key) && key !== 'length')
			{
				var params = {
					method: val.hash.type, 
					data: val.hash.data, //encodeURIComponent(JSON.stringify(val.hash.data)),
					url: val.urlName,
				};

				if(Configuration.apiVersion >= 3.2)
				{
					params._version = Configuration.apiVersion;
				}
				else
				{
					params.version = Configuration.apiVersion;
				}

				if(Configuration.debugMode)
				{
					params._debug = true;
				}
				
				req[key] = params;
			}
		});

		return {requests: req};
	},

	_send: function()
	{
		if(this.get('length') > 0)
		{
			if(this.get('length') === 1)
			{
				var obj = this.get('requests');
				Ember$.each(obj, function(k, v) 
				{
					if(obj.hasOwnProperty(k) && k !== 'length') 
					{
						Ember$.ajax(v.hash);
					}
				});
			
				this.reset();
			}
			else
			{
				this.commit();
			}
		}

		Ember.run.later(this, function()
		{
			this._send();
		}, this.get('interval'));
	},

	commit: function()
	{
		this._request(this.get('requests'), this.get('response'));
		this.reset();
	},

	reset: function()
	{
		this.set('requests', {});
		this.set('response', {});
		this.set('hashMap', {});
		this.set('length', 0);
	},

	initializeRequest: function()
	{
		var authUser = this.get('session.session.authenticated');
		var batchRequest = rpc.create('batch');

		if(!Ember.isNone(authUser.public_key))
		{
			batchRequest.set('publicKey', authUser.public_key); 
		}
		else
		{
			batchRequest.set('authUser', authUser.auth_hash);
		}

		return batchRequest;
	},

	/**
	 * Converts the url method passed in to the environment url of the server
	 *
	 * @private
	 * @method ajaxUrl
	 * @return {string}
	 */
	ajaxUrl: function()
	{
		var url = Configuration.apiURL + '/batch?';
		
		if(Configuration.apiVersion >= 3.2)
		{
			url += '_version=' + Configuration.apiVersion;
		}
		else
		{
			url += 'version=' + Configuration.apiVersion;
		}

		if(Configuration.debugMode === true)
		{
			url += '&_debug=true';
		}

		return url;
	},

	_request: function(hashData, responses)
	{
		var _this = this;
		var data = this.prepareRequests(hashData);

		var request = {};
			request.method = 'batch-rest';
			request.params = data;
			request.id = 1;
			request.jsonrpc = '2.0';


		var xhr = {};
			xhr.url = this.ajaxUrl();
			xhr.data = JSON.stringify(request);
			xhr.type = "POST";
			xhr.dataType = "json";

		xhr.success = function(result, textStatus, jqXHR)
		{
			return _this.success(result.result, responses, jqXHR);
		};

		xhr.error = function()
		{
			return _this.error.apply(_this, arguments);
		};
		
		// set auth header if public key is set
		var authUser = this.get('session.session.authenticated');
		if(!Ember.isNone(authUser.public_key) || !Ember.isNone(authUser.auth_hash))
		{
			xhr.beforeSend = function(request)
			{
				if(authUser.public_key)
				{
					request.setRequestHeader('Key-Authorization', authUser.public_key);
				}
				else
				{
					request.setRequestHeader('Authorization', 'Basic ' + authUser.auth_hash);
				}
			};
		}

		Ember$.ajax(xhr);
	},

	dispatchResponse: function(key, response, responseHandlers, jqXHR)
	{
		if(responseHandlers[key] !== undefined)
		{
			// get this response's handlers
			var handlers = responseHandlers[key];
			Ember$.each(handlers, function(index, handler)
			{
				if(handlers.hasOwnProperty(index))
				{
					var textStatus = response.success ? 'success' : 'error';
					handler.hash.success.call(handler.hash.context, response, textStatus, jqXHR);
				}
			});
		}
		else
		{
			// key not found
			Ember.warn('There was a propblem calling the success method for [' + key + ']');
		}
	},

	success: function(response, responseHandlers, jqXHR)
	{
		var _this = this;
		if(response.success)
		{
			// dispatch each respsonse
			var results = response.data.results;
			Ember$.each(results, function(key, val)
			{
				if(results.hasOwnProperty(key))
				{
					_this.dispatchResponse(key, val, responseHandlers, jqXHR);
				}
			});
		}
		else
		{
			Ember.Logger.error('error', response);
		}
	},

	error: function(err)
	{
		if(err.status === 401)
		{
			this.get('session').invalidate('authenticator:basic', {});
		}
		else
		{
			Ember.Logger.error('error', err);
		}
	}
});
