import Ember from 'ember';
import StoreFindersMixin from 'busy-data/mixins/store-finders';
import { module, test } from 'qunit';

module('Unit | Mixin | store finders');

// Replace this with your real tests.
test('it works', function(assert) {
  let StoreFindersObject = Ember.Object.extend(StoreFindersMixin);
  let subject = StoreFindersObject.create();
  assert.ok(subject);
});
