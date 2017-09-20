/**
 * default busy-data import
 */
import DS from 'ember-data';
import { merge } from '@ember/polyfills';
import { get } from '@ember/object';
import RPCModelMixin from 'data/mixins/rpc-model';

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
	errorResponse() {
		//debugger;
	},

	eachRelationship(callback, binding) {
		get(this, 'relationshipsByName').forEach(function(relationship, name) {
			if (relationship.options.modelName !== relationship.type) {
				relationship.type = relationship.options.modelName;
			}
			callback.call(binding, name, relationship);
		});
	},

	typeForRelationship(name, store) {
		var relationship = get(this, 'relationshipsByName').get(name);
		if (relationship.options.modelName !== relationship.type) {
			relationship.type = relationship.options.modelName;
		}
		return relationship && store.modelFor(relationship.type);
	},
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

const BS = merge({}, DS);

BS.RPCModel = DS.Model.extend(RPCModelMixin, {});
export default BS;

