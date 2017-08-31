/**
 * @module store
 *
 */
import DS from 'ember-data';
import StoreFinders from 'busy-data/mixins/store-finders';

/**
 * `Service/Store`
 *
 */
export default DS.Store.extend(StoreFinders, {
});
