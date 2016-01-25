/**
 * @module addon/utils
 *
 */
import Ember from 'ember';


export default Ember.Object.extend(
{
	dataService: Ember.inject.service('busy-data'),

	getAuthHeaders: function()
	{
		var authUser = this.get('dataService.authKey');
		var headers = null;

		if(authUser && authUser.type === 10)
		{
			headers = {'Key-Authorization': authUser.key};
		}
		else if(authUser && authUser.type === 20)
		{
			headers = {'Authorization': 'Basic ' + authUser.key};
		}

		return headers;
	},

	addUrlParams: function(url)
	{
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

	ajaxOptions: function(url, data, type, context, host)
	{
		console.log('api: ', url);
		// setup the url
		url = this.addUrlParams(host + '/' + url.replace(/^\//, ''));

		console.log('api: ', url);

		var hash = {};
			hash.url = url;
			hash.type = type;
			hash.dataType = 'json';
			hash.context = context;
			hash.data = data;

		// setup special headers like auth
		var headers = this.getAuthHeaders();
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

	ajax: function(url, data, type, context, host)
	{
		Ember.assert('url is required as type string in Api.ajax', !Ember.isNone(url) && typeof url === 'string');

		// check optional params and set defaults
		data = !Ember.isNone(data) ? data : {};
		type = !Ember.isNone(type) ? type : 'GET';
		context = !Ember.isNone(context) ? context : this;
		host = !Ember.isNone(host) ? host : this.get('dataService.host');

		Ember.assert('param <type> must be of type string in Api.ajax()', typeof data === 'string');

		var api = this;
		return new Ember.RSVP.Promise(function(resolve, reject)
		{
			var hash = api.ajaxOptions(url, data, type, context, host);

			// on success method
			hash.success = function (payload, textStatus, jqXHR) 
			{
				Ember.run(null, resolve, {payload: payload, textStatus: textStatus, jqXHR: jqXHR});
			};

			// on error method
			hash.error = function(err)
			{
				if(err.status === 401)
				{
					api.get('dataService').invalidateSession();
				}
				else if(api.get('dataService.degug'))
				{
					Ember.Logger.error('API FAILED:', err);
				}

				Ember.run(null, reject, err);
			};

			Ember.$.ajax(hash);
		});
	}
});
