/**
 * @module collections
 *
 */
import Ember from 'ember';
import Collection from 'busy-data/utils/collection';

/**
 *
 */
export default Collection.extend(
{
	/**
	 * Use this function to rebuild the data structure
	 * returned from the getter calls
	 *
	 * @public
	 * @method buildModels
	 * @param data {object} keyed model object
	 * @returns {array|object}
	 */
	buildModels: function(data)
	{
		// Set up the data structure however it needs to be for this collection.
		// buildModels can return either an array of models or a single model
		// with nested model objects.

		return data;
	},

	/**
	 * Collections may have a predefined model
	 * structure for reusability. This is not required
	 * so this function may be removed if not used.
	 *
	 * @public
	 * @method model
	 * @return {Ember.RSVP.Promise}
	 */
	model: function()
	{
		/**
		 * example code
		 *
		 * var getter = this.getter
		 *	   getter.query('some-model', {});
		 *
		 * return getter.fetch();
		 */

		// remove the next line of code
		return Ember.RSVP.resolve({});
	},
});
