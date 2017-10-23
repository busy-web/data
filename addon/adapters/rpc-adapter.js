/**
 * @module library
 *
 */
import $ from 'jquery';
import { run } from '@ember/runloop';
import { Promise as EmberPromise } from 'rsvp';
import { typeOf, isNone } from '@ember/utils';
import { assert } from '@ember/debug';
import { inject as service } from '@ember/service';
import EmberObject, { computed } from '@ember/object';

/**
 * `Library\RPC`
 *
 * @class RPC
 *
 * Sends and recieves RPC server calls
 *
 * @extends Ember.Object
 */
export default EmberObject.extend(
{
	dataService: service('busy-data'),

	baseURL: null,

	url: '',

	/**
	 * sets the api call headers for the authenticated user
	 *
	 * @private
	 * @method headers
	 */
	headers: computed('dataService.authKey', function()
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

	/**
	 * RPC fetch call
	 *
	 * This method calls an rpc method on the server and returns the result
	 * in an Ember.Promise
	 *
	 * Used to get data from the server.
	 *
	 * @public
	 * @method fetch
	 * @param method {string} The rpc server method to call
	 * @param params {object} The rpc server params that the server method requires
	 * @return {Ember.RSVP.Promise}
	 */
	call: function(method, params)
	{
		// method must be passed in and must be a string
		assert('RPC ERROR: the rpc server method must be provided and it must be a string', typeOf(method) === 'string');

		// null or undefined params is accepted so if params is
		// null or undefined then create an empty object
		params = isNone(params) ? {} : params;

		// assert params is an object and not a string, number or boolean
		assert('RPC ERROR: params must be an object if it is passed in!', typeOf(params) === 'object');

		return this.ajax(method, params);
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
		var url = this.get('dataService.host');
		if(!isNone(this.get('baseURL')))
		{
			url = this.get('baseURL');
		}

		url = url + '/' + this.get('url');

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

	/**
	 * Takes the url, data and method and converts them to an
	 * xhr object for the ajax method
	 *
	 * @private
	 * @method ajaxOptions
	 * @param method {string} The ajax type for the call eg. GET || POST
	 * @param params {object} The data params for the server
	 * @return {object}
	 */
	ajaxOptions: function(method, params)
	{
		var request = {};
			request.method = method;
			request.params = params;
			request.id = 1;
			request.jsonrpc = '2.0';


		var xhr = {};
			xhr.url = this.ajaxUrl();
			xhr.data = JSON.stringify(request);
			xhr.type = "POST";
			xhr.dataType = "json";


		// set auth header if public key is set
		var headers = this.get('headers');
		if(!isNone(headers))
		{
			xhr.beforeSend = function(request)
			{
				Object.keys(headers).forEach(function(key)
				{
					request.setRequestHeader(key, headers[key]);
				});
			};
		}

		return xhr;
	},

	/**
	 * Creates an ajax call and returns an Ember Promise for success and error
	 *
	 * @private
	 * @method ajax
	 * @param method {string} The ajax type for the call eg. GET || POST
	 * @param params {object} The data params for the server
	 * @return {Ember.RSVP.Promise}
	 */
	ajax: function(method, params)
	{
		var rpc = this;
		return new EmberPromise(function(resolve, reject)
		{
			// creates the xhr object
			var xhr = rpc.ajaxOptions(method, params);

			// on success method
			xhr.success = function(res)
			{
				if(res.result.success)
				{
					run(null, resolve, res.result);
				}
				else
				{
					run(null, reject, res.result);
				}
			};

			// on error method
			xhr.error = function(error)
			{
				run(null, reject, error);
			};

			// send
			$.ajax(xhr);
		});
	},
});
