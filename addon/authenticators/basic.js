/**
 * @module Authenticators
 *
 */
import Ember from 'ember';
import Base from 'ember-simple-auth/authenticators/base';
import fetch from 'fetch';

const { RSVP: { Promise }, get, set, isEmpty } = Ember;

/**
 * Basic Auth Authenticator
 *
 */
export default Base.extend({
	store: Ember.inject.service('store'),

	/**
	 * endpoint to make request to
	 *
	 */
	serverTokenEndpoint: 'token',

	/**
	 * name of the token to use for authenticated calls
	 * thet is returned from the auth endpoint
	 *
	 */
	tokenAttributeName: 'token',

	/**
	 * GET query may need to use the identifier to filter the results
	 *
	 */
	identifierName: '',

	restore(data) {
		return Promise.resolve(data);
	},

	normalizeResponse(data) {
		return data;
	},

	validateResponse() {
		return true;
	},

	invalidMessage() {
		return { message: "Authentication Failed", code: 1001 };
	},

	authenticate(identifier, password, token) {
		if (token) {
			return Promise.resolve(token);
		}

		const query = {};
		if (!isEmpty(get(this, 'identifierName'))) {
			set(query, get(this, 'identifierName'), identifier);
		}

		const auth = window.btoa(identifier + ':' + password);
		return this.makeRequest(auth, query).then(response => {
      if (response.ok) {
				return response.json().then(data => {
					if (this.validateResponse(data)) {
						let resp = this.normalizeResponse(data);
						return resp;
					} else {
						let { message, code } = this.invalidMessage(data);
						return Promise.reject({ status: 401, code, message });
					}
				});
			} else {
				return response.json().then(err => {
					return Promise.reject({ status: response.status, code: err.code[0], message: "Authentication Failed" });
				});
			}
		});
	},

	invalidate(data) {
		return Promise.resolve(data);
	},

	makeRequest(basicAuth, query={}) {
		query = query || {};

		const adapter = this.get('store')._instanceCache.get('adapter');
		let url = adapter.urlForRequest({
			type: { modelName: this.get('serverTokenEndpoint') },
			requestType: 'query',
			query: query
		});

		let body = Ember.$.param(query);
		url = [ url, body ].join('&');

    let requestOptions = {
      method: 'GET',
      headers: {
        'accept': 'application/json; charset=utf-8',
        'content-type': 'application/json; charset=utf-8',
				'Authorization': 'Basic ' + basicAuth
      }
    };

    return fetch(url, requestOptions);
  }
});
