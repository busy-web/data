import Ember from 'ember';
import RpcAdapterMixin from 'busy-data/mixins/rpc-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcAdapterObject = Ember.Object.extend(RpcAdapterMixin);
  let subject = RpcAdapterObject.create();
  assert.ok(subject);
});
