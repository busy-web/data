import { moduleFor, test } from 'ember-qunit';

moduleFor('adapter:rest-adapter', 'Unit | Adapter | rest adapter', {
  // Specify the other units that are required for this test.
  // needs: ['serializer:foo']
});

// Replace this with your real tests.
test('it exists', function(assert) {

	console.log('rest-adapter', this);
  let adapter = this.subject();
  assert.ok(adapter);
});
