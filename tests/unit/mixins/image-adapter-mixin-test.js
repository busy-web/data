import Ember from 'ember';
import ImageAdapterMixinMixin from 'busy-data/mixins/image-adapter-mixin';
import { module, test } from 'qunit';

module('Unit | Mixin | image adapter mixin');

// Replace this with your real tests.
test('it works', function(assert) {
  let ImageAdapterMixinObject = Ember.Object.extend(ImageAdapterMixinMixin);
  let subject = ImageAdapterMixinObject.create();
  assert.ok(subject);
});
