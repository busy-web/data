/**
 * @module Initializers
 *
 */
import localStore from 'busy-data/session-stores/local-store';

export default function setupAuth(registry) {
	var inject = registry.inject || registry.injection;
	registry.register('session-store:local-store', localStore);
	inject.call(registry, 'session:main', 'store', 'session-store:local-store');
}
