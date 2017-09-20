import EmberObject from '@ember/object';
import RpcStoreMixin from 'busy-data/mixins/rpc-store';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc store');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcStoreObject = EmberObject.extend(RpcStoreMixin);
  let subject = RpcStoreObject.create();
  assert.ok(subject);
});
