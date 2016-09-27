import Ember from 'ember';
import JsonApiSerializerMixin from 'busy-data/mixins/json-api-serializer';
import { module, test } from 'qunit';

module('Unit | Mixin | json api serializer');

// Replace this with your real tests.
test('it works', function(assert) {
  let JsonApiSerializerObject = Ember.Object.extend(JsonApiSerializerMixin);
  let subject = JsonApiSerializerObject.create();
  assert.ok(subject);
});
