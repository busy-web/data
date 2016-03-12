/**
 * @module rpcs/clients
 *
 */
import Ember from 'ember';

export default Ember.Object.extend(
{
	store: null,
	clientName: '',

	modelFor: function(modelName)
	{
		if(this.store.isValidRPC(modelName))
		{
			return this.store.modelFor(modelName);
		}
		else
		{
			return this.store.modelFor('rpc.' + modelName);
		}
	},
});
