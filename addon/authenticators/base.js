/**
 * @module authenticator
 *
 */
import Ember from 'ember';
import Base from 'ember-simple-auth/authenticators/base';

const { getOwner } = Ember;

export default Base.extend(
{
	authModel: '',

	dataService: Ember.inject.service('busy-data'),

	restore(data)
	{
		return new Ember.RSVP.Promise((resolve, reject) => {
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

	authenticate(options)
	{
		Ember.assert("You must provide 'username and password' or 'token' to authenticate", (options.token || (options.username && options.password)));

		if(options.username && options.password)
		{
			options.password = this.hashPassword(options.password);

			return this.ajax(this.get('authModel'), options).then((authData) => {
				let authHash;
				if(options.username && options.password)
				{
					authHash = btoa(options.username + ':' + options.password);
				}

				let auth = this.gennerateAuthObject(authData, authHash);
				this.onValidated();

				return auth;
			});
		}
		else
		{
			return new Ember.RSVP.Promise((resolve) => {
				Ember.run(null, resolve, {id: options.id, public_key: options.token, verifiedEmail: true});
			});
		}
	},

	hashPassword(password)
	{
		return Ember.CryptoJS.SHA256(password).toString();
	},

	gennerateAuthObject(authData)
	{
		return authData;
	},

	onValidated()
	{

	},

	onInvalidated()
	{

	},

	ajaxOptions(url, options)
	{
		// generate url
		url = this.get('dataService.host') + '/' + url;

		// get url args
		if(this.get('dataService.shouldSendVersion')) {
			url = url + '?' + this.get('dataService.versionUrlParam') + '=' + this.get('dataService.version');
		}

		// set debug flag
		if(this.get('dataService.debug')) {
			url = url + '&' + this.get('dataService.debugUrlParam') + '=true';
		}

		var xhr = {
			url: url,
			method: 'GET',
			beforeSend(xhr) {
				if(options.username && options.password) {
					xhr.setRequestHeader('Authorization', 'Basic ' + btoa(options.username + ':' + options.password));
				} else if(options.token) {
					xhr.setRequestHeader('Key-Authorization', options.token);
				}
			}
		};

		if(options.username) {
			xhr.data = {
				username: options.username
			};
		} else if(options.id) {
			xhr.data = {
				id: options.id
			};
		}

		return xhr;
	},

	ajax(url, options)
	{
		var xhr = this.ajaxOptions(url, options);
		return new Ember.RSVP.Promise((resolve, reject) => {
			xhr.success = (result) => {
				if(typeof result === 'string') {
					result = JSON.parse(result);
				}

				if(result.success) {
					Ember.run(null, resolve, result);
				} else {
					Ember.run(null, reject, result);
				}
			};

			xhr.error = (err) => {
				Ember.run(null, reject, err);
			};

			Ember.$.ajax(xhr);
		});
	},

	invalidate(session)
	{
		var store = getOwner(this).lookup('session-store:application');
			store.clear();

		return new Ember.RSVP.Promise((resolve) => {
			this.onInvalidated();
			Ember.run(null, resolve, session);
		});
	}
});
