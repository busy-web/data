/* eslint-env node */
module.exports = {

	normalizeEntityName() {},

	afterInstall(/*options*/)  {
		return this.addAddonToProject('ember-data', '2.12.1').then(() => {
			return this.addAddonToProject('ember-simple-auth', '1.2.1').then(() => {
				return this.addAddonToProject('busy-utils', '2.4.1');
			});
		});
	}
};
