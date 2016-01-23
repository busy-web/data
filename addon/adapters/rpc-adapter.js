/**
 * @module library
 *
 */
import Ember from 'ember';
import Configuration from './../configuration';

/**
 * `Library\RPC`
 *
 * @class RPC
 *
 * Sends and recieves RPC server calls
 *
 * @extends Ember.Object
 */
var rpcClient = Ember.Object.extend(
{
	baseUrl: function()
	{
		return Configuration.apiURL;
	}.property(),

	args: function()
	{
		if(Configuration.apiVersion >= 3.2)
		{
			return '?_version=' + Configuration.apiVersion;
		}
		else
		{
			return '?version=' + Configuration.apiVersion;
		}
	}.property(),

	url: '',

	/**
	 * stores the users publicKey for auth calls
	 *
	 * @property
	 * @type string
	 */
	publicKey: null,
	authUser: null,

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
		Ember.assert('RPC ERROR: the rpc server method must be provided and it must be a string', Ember.typeOf(method) === 'string');

		// null or undefined params is accepted so if params is
		// null or undefined then create an empty object
		params = Ember.isNone(params) ? {} : params;

		// assert params is an object and not a string, number or boolean
		Ember.assert('RPC ERROR: params must be an object if it is passed in!', Ember.typeOf(params) === 'object');

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
		var url = this.get('baseUrl') + '/' + this.get('url') + this.get('args');

		if(Configuration.debugMode === true)
		{
			url += '&_debug=true';
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
		var _this = this;
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
		if(!Ember.isNone(this.get('publicKey')) || !Ember.isNone(this.get('authUser')))
		{
			xhr.beforeSend = function(request)
			{
				if(_this.get('publicKey'))
				{
					request.setRequestHeader('Key-Authorization', _this.get('publicKey'));
				}
				else
				{
					request.setRequestHeader('Authorization', 'Basic ' + _this.get('authUser'));
				}
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
		return new Ember.RSVP.Promise(function(resolve, reject)
		{
			// creates the xhr object
			var xhr = rpc.ajaxOptions(method, params);

			// on success method
			xhr.success = function(res)
			{
				if(res.result.success)
				{
					Ember.run(null, resolve, res.result);
				}
				else
				{
					Ember.run(null, reject, res.result);
				}
			};

			// on error method
			xhr.error = function(error)
			{
				Ember.run(null, reject, error);
			};

			// send
			Ember.$.ajax(xhr);
		});
	},
});

rpcClient.reopenClass(
{
	_create: rpcClient.create,

	create: function(url, token)
	{
		var client = this._create();

		client.set('url', url);
		client.set('publicKey', token);

		return client;
	}
});

export default rpcClient;
