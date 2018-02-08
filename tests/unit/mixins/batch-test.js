import EmberObject from '@ember/object';
import BatchMixin from '@busy-web/data/mixins/batch';
import { module, test } from 'qunit';

module('Unit | Mixin | batch');

// Replace this with your real tests.
test('it works', function(assert) {
  let BatchObject = EmberObject.extend(BatchMixin);
  let subject = BatchObject.create();
  assert.ok(subject);
});
