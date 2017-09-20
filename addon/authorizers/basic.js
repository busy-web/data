/**
 * @module Authorizors
 *
 */
import { isEmpty } from '@ember/utils';

import { get } from '@ember/object';
import BaseAuthorizer from 'ember-simple-auth/authorizers/base';

/**
 * `BusyData/Authorizers/Base`
 *
 */
export default BaseAuthorizer.extend({
	type: 'Authorization',
	tokenName: 'token',

	authorize(data, block) {
		// the token to pass with the custom header
		const tokenName = this.get('tokenName');

		const type = this.get('type');
		const token = get(data, tokenName);

		if (!isEmpty(token)) {
			block(type, token);
		}
	},
});
