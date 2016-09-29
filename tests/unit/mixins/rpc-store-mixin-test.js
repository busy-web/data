import Ember from 'ember';
import RpcStoreMixinMixin from 'busy-data/mixins/rpc-store-mixin';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc store mixin');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcStoreMixinObject = Ember.Object.extend(RpcStoreMixinMixin);
  let subject = RpcStoreMixinObject.create();
  assert.ok(subject);
});
