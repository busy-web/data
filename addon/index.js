/**
 * default busy-data import
 */
import DS from 'ember-data';
import Ember from 'ember';
import join from './utils/join';
import joinAll from './utils/join-all';
import RPCModelMixin from './mixins/rpc-model';
import FilterObject from './utils/filter-object';
import FilterArray from './utils/filter-array';

DS.Model.reopenClass({
	eachRelationship(callback, binding) {
		Ember.get(this, 'relationshipsByName').forEach(function(relationship, name) {
			if (relationship.options.modelName) {
				relationship.type = relationship.options.modelName;
			}
			callback.call(binding, name, relationship);
		});
	}
});

const BS = Object.assign({}, DS);

BS.RPCModel = DS.Model.extend(RPCModelMixin, {});
BS.join = join;
BS.joinAll = joinAll;
BS.FilterObject = FilterObject;
BS.FilterArray = FilterArray;

export default BS;
