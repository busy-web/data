/**
 * @module stores
 *
 */
import LocalStorage from 'ember-simple-auth/session-stores/local-storage';

/**
 * `Stores/LocalStorage`
 *
 * @class LocalStorage class
 *
 * @extends SimpleAuth.LocalStorage
 */
export default LocalStorage.extend(
{
	key: 'busy-data:session',

	persist: function(data)
	{
		debugger;
		data = data || {};
		var storedData = JSON.parse(localStorage.getItem(this.key)) || {};

		if(data.authenticated !== undefined && data.authenticated.invalidate)
		{
			storedData = {};
			localStorage.setItem(BusyApp.authKeys.activeMemberKey, '');
			localStorage.setItem(BusyApp.authKeys.authMapKey, '');
		}
		else if(data.authenticated !== undefined && data.authenticated.id !== undefined)
		{
			storedData[data.authenticated.id] = data;
			localStorage.setItem(BusyApp.authKeys.activeMemberKey, data.authenticated.id);
		}

		var json = JSON.stringify(storedData);
		localStorage.setItem(this.key, json);

		this._lastData = this.restore();
	},

	restore: function()
	{
		var data = localStorage.getItem(this.key);
		var id = localStorage.getItem(BusyApp.authKeys.activeMemberKey);

		data = JSON.parse(data);

		return data[id] || {};
	},

	clear: function()
	{
		localStorage.removeItem(this.key);
		localStorage.removeItem(BusyApp.authKeys.activeMemberKey);
		localStorage.removeItem(BusyApp.authKeys.authMapKey);
		localStorage.removeItem(BusyApp.authKeys.switchKey);
		this._lastData = {};
	}
});
