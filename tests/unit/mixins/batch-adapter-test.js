import Ember from 'ember';
import BatchAdapterMixin from 'busy-data/mixins/batch-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | batch adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let BatchAdapterObject = Ember.Object.extend(BatchAdapterMixin);
  let subject = BatchAdapterObject.create();
  assert.ok(subject);
});
