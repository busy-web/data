import Ember from 'ember';
import RpcModelMixin from 'busy-data/mixins/rpc-model';
import { module, test } from 'qunit';

module('Unit | Mixin | rpc model');

// Replace this with your real tests.
test('it works', function(assert) {
  let RpcModelObject = Ember.Object.extend(RpcModelMixin);
  let subject = RpcModelObject.create();
  assert.ok(subject);
});
