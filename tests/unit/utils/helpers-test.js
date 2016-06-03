import helpers from 'dummy/utils/helpers';
import { module, test } from 'qunit';

module('Unit | Utility | helpers');

/**
 * Test getModelProperty
 *
 */
test('test getModelProperty', function(assert) {
	let property = "test poperty";
	let object = {property: property};

	assert.equal(property, helpers.getModelProperty(object, 'property'), "getModelProperty returned correct property");
});

/**
 * Test setModelProperty
 *
 */
test('test setModelProperty', function(assert) {
	let property = "test poperty";
	let object = {property: ''};
	
	helpers.setModelProperty(object, 'property', property);

	assert.equal(property, object.property, "setModelProperty set the correct property");
});

/**
 * Test generateId
 *
 */
test('test generateId', function(assert) {
	let id = helpers.generateId();

	assert.equal('string', typeof id, "generateId returned a string");
	assert.equal(36, id.length, "generateId returned the correct length for the string");
});

/**
 * Test generateModelPath
 *
 */
test('test generateModelPath', function(assert) {

	let path = "member.timeEntry.timeEntryLocation";

	assert.equal(path, helpers.generateModelPath("member.timeEntry", "timeEntryLocation"), "generateModelPath returned the correct path");
});

/**
 * Test mergeObject
 *
 */
test('test mergeObject', function(assert) {
	
	let obj = {
		'member': {},
		'time_entry': {}
	};

	let obj2 = {
		"organization": {}
	};

	var merge = helpers.mergeObject(obj, obj2);

	assert.ok(merge.member && merge.time_entry && merge.organization);
});
