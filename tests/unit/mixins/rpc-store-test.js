import Ember from 'ember';
import RpcStoreMixin from 'busy-data/mixins/rpc-store';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc store');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcStoreObject = Ember.Object.extend(RpcStoreMixin);
  let subject = RpcStoreObject.create();
  assert.ok(subject);
});
