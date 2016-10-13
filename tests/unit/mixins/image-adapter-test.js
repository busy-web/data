import Ember from 'ember';
import ImageAdapterMixin from 'busy-data/mixins/image-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | image adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let ImageAdapterObject = Ember.Object.extend(ImageAdapterMixin);
  let subject = ImageAdapterObject.create();
  assert.ok(subject);
});
