/*jshint node:true*/
module.exports = {
	
	normalizeEntityName: function() {},

	afterInstall: function(/*options*/) 
	{
		var _this = this;
		return this.addBowerPackageToProject('node-uuid', '1.4.7').then(function()
		{
			return _this.addAddonToProject('ember-simple-auth@1.1.0');
		});
	}
};
