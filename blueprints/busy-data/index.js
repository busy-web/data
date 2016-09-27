/*jshint node:true*/
module.exports = {

	normalizeEntityName() {},

	afterInstall(/*options*/)  {
		return this.addAddonToProject('ember-simple-auth@1.1.0');
	}
};
