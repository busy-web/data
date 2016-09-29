/**
 * @module Authorizors
 *
 */
import Ember from 'ember';
import BaseAuthorizer from 'ember-simple-auth/authorizers/base';

/***/
const { isEmpty } = Ember;

/**
 * `BusyData/Authorizers/Base`
 *
 */
export default BaseAuthorizer.extend({
	authHeader: 'Authorization',

	tokenAttr: 'token',
	basicAttr: 'userHash',

	useFallback: false,

	authorize(data, block) {
		// custom auth header defaults to: Authorization
		const authHeader = this.get('authHeader');

		// the token to pass with the custom header
		const tokenAttr = this.get('tokenAttr');
		const token = data[tokenAttr];

		// if the token was found use the token otherwise
		// use a basic auth fallback method.
		if (!isEmpty(token)) {
			block(authHeader, token);
		} else if (this.get('useFallback')) {
			// this is a basic auth fallback where the userHash must be
			// a btoa(user:password) hash.
			const basicAttr = this.get('userHash');
			const userHash = data[basicAttr];

			if (!isEmpty(userHash)) {
				block('Authorization', `Basic ${userHash}`);
			}
		}
	},
});
