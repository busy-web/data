import EmberObject from '@ember/object';
import RpcAdapterMixin from '@busybusy/data/mixins/rpc-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcAdapterObject = EmberObject.extend(RpcAdapterMixin);
  let subject = RpcAdapterObject.create();
  assert.ok(subject);
});
