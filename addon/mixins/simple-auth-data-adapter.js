/**
 * @module Mixins
 *
 */
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

export default Mixin.create(DataAdapterMixin, {
  /**
	 * Overrides ember simple auth to support ds-improved-ajax calls
	 *
	 * Defines a `beforeSend` hook (see http://api.jquery.com/jQuery.ajax/) that
	 * injects a request header containing the authorization data as constructed
	 * by the {{#crossLink "DataAdapterMixin/authorizer:property"}}{{/crossLink}}
	 * (see {{#crossLink "SessionService/authorize:method"}}{{/crossLink}}). The
	 * specific header name and contents depend on the actual authorizer that is
	 * used.
	 *
	 * Until [emberjs/rfcs#171](https://github.com/emberjs/rfcs/pull/171)
	 * gets resolved and [ds-improved-ajax](https://github.com/emberjs/data/pull/3099)
	 * [feature flag](https://github.com/emberjs/data/blob/master/FEATURES.md#feature-flags)
	 * is enabled, this method will be called for **every** ember-data version.
	 * `headersForRequest` *should* replace it after the resolution of the RFC.
	 *
	 * @method headersForRequest
	 * @protected
	 */
	_requestToJQueryAjaxHash(request) {
		let hash = this._super(request);
    let { beforeSend } = hash;

    hash.beforeSend = (xhr) => {
      if (this.get('authorizer')) {
        const authorizer = this.get('authorizer');
        this.get('session').authorize(authorizer, (headerName, headerValue) => {
          xhr.setRequestHeader(headerName, headerValue);
        });
      } else {
        this.authorize(xhr);
      }

      if (beforeSend) {
        beforeSend(xhr);
      }
    };

		return hash;
	},

  authorize() {
    assert('The `authorize` method should be overridden in your application adapter. It should accept a single argument, the request object.');
	},

	headersForRequest() {
		let headers = this.get('headers') || {};
		headers['Accept'] = 'application/vnd.api+json';
		return headers;
  }
});
