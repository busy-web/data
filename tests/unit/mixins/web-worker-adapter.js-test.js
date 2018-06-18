import EmberObject from '@ember/object';
import WebWorkerAdapter.JsMixin from '@busy-web/data/mixins/web-worker-adapter.js';
import { module, test } from 'qunit';

module('Unit | Mixin | web worker adapter.js');

// Replace this with your real tests.
test('it works', function(assert) {
  let WebWorkerAdapter.JsObject = EmberObject.extend(WebWorkerAdapter.JsMixin);
  let subject = WebWorkerAdapter.JsObject.create();
  assert.ok(subject);
});
