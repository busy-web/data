import { moduleFor, test } from 'ember-qunit';

moduleFor('adapter:batch-adapter', 'Unit | Adapter | batch adapter', {
  // Specify the other units that are required for this test.
  needs: ['service:busy-data']
});

// Replace this with your real tests.
test('it exists', function(assert) {
  let adapter = this.subject();
  assert.ok(adapter);
});
