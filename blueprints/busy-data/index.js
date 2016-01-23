/*jshint node:true*/
module.exports = {
	
	//description: ''

	//locals: function(options) {
	//  // Return custom template variables here.
	//  return {
	//    foo: options.entity.options.foo
	//  };
	//}
	
	normalizeEntityName: function() {},

	afterInstall: function(/*options*/) 
	{
		var _this = this;
		return this.addBowerPackageToProject('node-uuid', '~1.4.3').then(function()
		{
			return _this.addAddonToProject('ember-simple-auth@1.0.1');
		});
	}
};
