/*jshint node:true*/
/**
 * @module blueprints
 *
 */
module.exports = {
	
	//description: ''

	//locals: function(options) {
	//  // Return custom template variables here.
	//  return {
	//    foo: options.entity.options.foo
	//  };
	//}
	
	normalizeEntityName: function()
	{
	},

	afterInstall: function(/*options*/) 
	{
		// Perform extra work here.
		this.addBowerPackageToProject('node-uuid', '~1.4.3');
	}
};
