import Ember from 'ember';
import RpcModelMixinMixin from 'busy-data/mixins/rpc-model-mixin';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc model mixin');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcModelMixinObject = Ember.Object.extend(RpcModelMixinMixin);
  let subject = RpcModelMixinObject.create();
  assert.ok(subject);
});
