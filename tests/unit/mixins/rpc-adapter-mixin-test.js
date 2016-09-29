import Ember from 'ember';
import RpcAdapterMixinMixin from 'busy-data/mixins/rpc-adapter-mixin';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc adapter mixin');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcAdapterMixinObject = Ember.Object.extend(RpcAdapterMixinMixin);
  let subject = RpcAdapterMixinObject.create();
  assert.ok(subject);
});
