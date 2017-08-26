import Ember from 'ember';
import SimpleAuthDataAdapterMixin from 'busy-data/mixins/simple-auth-data-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | simple auth data adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let SimpleAuthDataAdapterObject = Ember.Object.extend(SimpleAuthDataAdapterMixin);
  let subject = SimpleAuthDataAdapterObject.create();
  assert.ok(subject);
});
