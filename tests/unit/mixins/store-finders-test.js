import EmberObject from '@ember/object';
import StoreFindersMixin from 'busy-data/mixins/store-finders';
import { module, test } from 'qunit';

module('Unit | Mixin | store finders');

// Replace this with your real tests.
test('it works', function(assert) {
  let StoreFindersObject = EmberObject.extend(StoreFindersMixin);
  let subject = StoreFindersObject.create();
  assert.ok(subject);
});
