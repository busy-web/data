/**
 * @module authenticator
 *
 */
import Ember from 'ember';
import Base from 'ember-simple-auth/authenticators/base';
import { Hash } from 'busy-utils';

const { getOwner } = Ember;

export default Base.extend({
	authModel: '',
	dataService: Ember.inject.service('busy-data'),

	restore(data) {
		return new Ember.RSVP.Promise((resolve, reject) => {
			if (data !== undefined) {
				Ember.run(null, resolve, data);
			} else {
				Ember.run(null, reject, data);
			}
		});
	},

	authenticate(options) {
		Ember.assert("You must provide 'username and password' or 'token' to authenticate", (options.token || (options.username && options.password)));

		options.success = typeof options.success === 'function' ? options.success : function(){};
		options.error = typeof options.error === 'function' ? options.error : function(){};

		if (options.username && options.password) {
			options.password = this.hashPassword(options.password);
		}

		return new Ember.RSVP.Promise((resolve, reject) => {
			//success function
			const success = (authData) => {
				// create a secure username and password hash to pass around.
				let authHash;
				if(options.username && options.password) {
					authHash = window.btoa(options.username + ':' + options.password);
				}

				// pass the secure username password and the authData from the api call
				const auth = this.gennerateAuthObject(authData, authHash, options.token);

				// validate the results
				const inValid = this.isInvalid(auth);

				if(!inValid) {
					this.onValidated();
					options.success(auth);
					Ember.run(null, resolve, auth);
				} else {
					options.error({status: inValid});
					Ember.run(null, reject, {status: 401, statusText: "Unauthorized"});
				}
			};

			// error function
			const error = (err) => {
				options.error(err);
				Ember.run(null, reject, err);
			};

			this.ajax(this.get('authModel'), options, success, error);
		});
	},

	hashPassword(password) {
		return Hash.sha256(password).toString();
	},

	gennerateAuthObject(authData) {
		return authData;
	},

	/**
	 * validates the auth results and returns nothing if valid and can return the error message or code on invalid.
	 *
	 * @method isInvalid
	 * @param {object} auth
	 * @return {mixed} true if valid.
	 */
	isInvalid(/*auth*/) {
		return;
	},

	onValidated() {},

	onInvalidated() {},

	ajaxOptions(url, options) {
		// generate url
		url = this.get('dataService.host') + '/' + url;

		if (options.id) {
			url += '/' + options.id;
			delete options.id;
		}

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
					xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(options.username + ':' + options.password));
				} else if(options.token) {
					xhr.setRequestHeader('Key-Authorization', options.token);
				}
			}
		};

		if(options.username) {
			xhr.data = { username: options.username };
		}
		return xhr;
	},

	ajax(url, options, onSuccess, onError) {
		const xhr = this.ajaxOptions(url, options);

		xhr.success = (result) => {
			if(typeof result === 'string') { result = JSON.parse(result); }
			if(result.success) {
				onSuccess(result);
			} else {
				onError(result);
			}
		};

		xhr.error = (err) => {
			onError(err);
		};

		Ember.$.ajax(xhr);
	},

	invalidate(session) {
		const store = getOwner(this).lookup('session-store:application');
		store.clear();
		return new Ember.RSVP.Promise((resolve) => {
			this.onInvalidated();
			Ember.run(null, resolve, session);
		});
	}
});
