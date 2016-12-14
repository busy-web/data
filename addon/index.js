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

DS.Model.reopen({
	reloadAll() {
		return this.reload().then(model => {
			this.reloadRelationships();
			return model;
		});
	},

	reloadRelationships() {
		this.eachRelationship(name => {
			const model = this.get(name);
			if (model.reload) {
				model.reload();
			} else {
				model.get('content');
				if (model.reload) {
					model.reload();
				}
			}
		});
	}
});

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

const belongsTo = DS.belongsTo;

DS.belongsTo = function(modelName, options={}) {
	options.modelName = modelName;
	return belongsTo(modelName, options);
};

const hasMany = DS.hasMany;

DS.hasMany = function(modelName, options={}) {
	options.modelName = modelName;
	return hasMany(modelName, options);
};

const BS = Object.assign({}, DS);

BS.RPCModel = DS.Model.extend(RPCModelMixin, {});
BS.join = join;
BS.joinAll = joinAll;
BS.FilterObject = FilterObject;
BS.FilterArray = FilterArray;

export default BS;
