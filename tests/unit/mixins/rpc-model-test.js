import EmberObject from '@ember/object';
import RpcModelMixin from '@busy-web/data/mixins/rpc-model';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc model');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcModelObject = EmberObject.extend(RpcModelMixin);
  let subject = RpcModelObject.create();
  assert.ok(subject);
});
