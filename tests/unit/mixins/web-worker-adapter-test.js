import EmberObject from '@ember/object';
import WebWorkerAdapterMixin from '@busy-web/data/mixins/web-worker-adapter';
import { module, test } from 'qunit';

module('Unit | Mixin | web worker adapter');

// Replace this with your real tests.
test('it works', function(assert) {
  let WebWorkerAdapterObject = EmberObject.extend(WebWorkerAdapterMixin);
  let subject = WebWorkerAdapterObject.create();
  assert.ok(subject);
});
