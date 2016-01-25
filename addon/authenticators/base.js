/**
 * @module authenticator
 *
 */
import Ember from 'ember';
import Base from 'ember-simple-auth/authenticators/base';

export default Base.extend(
{
	dataService: Ember.inject.service('busy-data'),

	restore: function(data)
	{
		return new Ember.RSVP.Promise(function(resolve, reject)
		{
			if(data !== undefined)
			{
				Ember.run(null, resolve, data);
			}
			else
			{
				Ember.run(null, reject, data);
			}
		});
	},

	authenticate: function(options)
	{
		var _this = this;

		Ember.assert("You must provide 'username and password' or 'token' to authenticate", (options.token || (options.username && options.password)));

		if(options.username && options.password)
		{
			options.password = Ember.CryptoJS.SHA256(options.password).toString();

			return _this.ajax('member', options).then(function(member)
			{
				var verified = (member.data[0].email_verification_required === false || member.data[0].verified_email === true);

				var auth = {
					id: member.data[0].id,
					public_key: member.public_key,
					private_key: member.private_key,
					username: options.username,
					verifiedEmail: verified,
					email: member.data[0].email
				};

				if(options.username && options.password)
				{
					auth.auth_hash = btoa(options.username + ':' + options.password);
				}

				_this.onValidated();

				return auth;
			});
		}
		else
		{
			return new Ember.RSVP.Promise(function(resolve)
			{
				Ember.run(null, resolve, {id: options.id, public_key: options.token, verifiedEmail: true});
			});
		}
	},

	onValidated: function()
	{

	},

	onInvalidated: function()
	{

	},

	ajaxOptions: function(url, options)
	{
		url = this.get('dataService.host') + '/' + url;

		if(this.get('dataService.shouldSendVersion'))
		{
			url = url + '?' + this.get('dataService.versionUrlParam') + '=' + this.get('dataService.version');
		}

		// set debug flag
		if(this.get('dataService.debug'))
		{
			url = url + '&' + this.get('dataService.debugUrlParam') + '=true';
		}

		var xhr = {
			url: url,
			method: 'GET',
			beforeSend: function(xhr)
			{
				if(options.username && options.password)
				{
					xhr.setRequestHeader('Authorization', 'Basic ' + btoa(options.username + ':' + options.password));
				}
				else if(options.token)
				{
					xhr.setRequestHeader('Key-Authorization', options.token);
				}
			}
		};

		if(options.username)
		{
			xhr.data = {
				username: options.username
			};
		}
		else if(options.id)
		{
			xhr.data = {
				id: options.id
			};
		}

		return xhr;
	},

	ajax: function(url, options)
	{
		var xhr = this.ajaxOptions(url, options);

		return new Ember.RSVP.Promise(function(resolve, reject)
		{
			xhr.success = function(result)
			{
				if(typeof result === 'string')
				{
					result = JSON.parse(result);
				}

				if(result.success)
				{
					Ember.run(null, resolve, result);
				}
				else
				{
					Ember.run(null, reject, result);
				}
			};

			xhr.error = function(err)
			{
				Ember.run(null, reject, err);
			};

			Ember.$.ajax(xhr);
		});
	},

	invalidate: function(session)
	{
		var auth = this;
		var store = this.container.lookup('session-store:application');
			store.clear();

		return new Ember.RSVP.Promise(function(resolve)
		{
			auth.onInvalidated();
			Ember.run(null, resolve, session);
		});
	}
});
