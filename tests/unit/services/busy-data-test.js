import { moduleFor, test } from 'ember-qunit';

moduleFor('service:busy-data', 'Unit | Service | busy data', {
  // Specify the other units that are required for this test.
  needs: ['adapter:batch-adapter']
});

// Replace this with your real tests.
test('it exists', function(assert) {
  let service = this.subject();
  assert.ok(service);
});
