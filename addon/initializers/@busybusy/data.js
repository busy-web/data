/**
 * @module app/initializers
 *
 */
import DS from 'ember-data';
import { get } from '@ember/object';
import RPCModelMixin from '@busybusy/data/mixins/rpc-model';

export default {
	name: '@busybusy/data',

	initialize(/*registry*/) {
		DS.RPCModel = DS.Model.extend(RPCModelMixin, {});

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

		DS.Model.reopen( {
			getRecord() {
				// fix for the model._internalModel issue.
				return this._internalModel.getRecord();
			},

			saveBatch(auto) {
				this._batch = true;
				this._autoBatch = auto === true ? true : false;
				return this.save();
			},

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
			}
		});
	}
};
