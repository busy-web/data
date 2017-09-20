import Ember from 'ember';
import BatchMixin from '@busybusy/data/mixins/batch';
import { module, test } from 'qunit';

module('Unit | Mixin | batch');

// Replace this with your real tests.
test('it works', function(assert) {
  let BatchObject = Ember.Object.extend(BatchMixin);
  let subject = BatchObject.create();
  assert.ok(subject);
});
