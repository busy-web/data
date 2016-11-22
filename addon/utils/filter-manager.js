/**
 * @module collections
 *
 */
import Ember from 'ember';
import Helper from 'busy-data/utils/helpers';

const {generateId} = Helper;

/**
 * `Collection\Collection`
 *
 */
export default Ember.ArrayProxy.extend(Ember.Evented,{
	content: null,
	store: null,
	manager: null,

	isLoading: false,
	isUpdating: false,

	update() {
		this.set('isUpdating', true);
		this.manager.update().then(() => {
			this.set('isUpdating', false);
		});
	},

	buildModels(data) {
		return data;
	},

	model() {
		return Ember.RSVP.resolve();
	},

	createPolymorph(type, content) {
		const owner = Ember.getOwner(this);
		const Polymorph = owner._lookupFactory('filter:' + Ember.String.dasherize(type));
		const polymorph = Polymorph.create({
			store: this.store,
			content: content,
			manager: this,
			getter: this,
			id: generateId(),
			_name: type
		});

		return polymorph;
	},

	populateModels(data) {
		this.set('isLoading', true);
		const models = this.buildModels(data);
		if (!Ember.isNone(models.forEach)) {
			models.forEach(model => {
				this.addInternalModel(model);
			});
		} else {
			this.set('model', models);
		}
		this.set('isLoading', false);
		return this;
	},

	objectAtContent(index) {
		const content = Ember.get(this, 'content');
		return content.objectAt(index);
	},

	addInternalModel(model, idx) {
		if (idx !== undefined) {
			this.get('content').removeAt(idx, 1);
			this.get('content').insertAt(idx, model);
		} else {
			this.get('content').pushObject(model);
		}
		return this;
	},

	removeInternalModel(model) {
		this.get('content').removeObject(model);
		return this;
	},
});
