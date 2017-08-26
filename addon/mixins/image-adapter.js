/**
 * @module Mixins
 *
 */
import Ember from 'ember';
import { Assert } from 'busy-utils';

/**
 * `BusyData/Mixins/ImageAdapter`
 *
 * @class ImageAdapter
 * @namespace BusyData.Mixins
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({

	_requestToJQueryAjaxHash(request) {
		let isFile = false;
		let method;
		if (request.data && typeof request.data === 'object' && request.data._fileObject) {
			isFile = true;
			method = request.method;
			request.method = "GET";
			request.headers.Accept = 'application/json; charset=utf-8';
		}

		const hash = this._super(request) || {};

		if (isFile) {
			hash.method = method;
			this.setupUpload(hash);
		}

		return hash;
	},

	/**
	 * set up the ajax call for a file upload
	 *
	 * @private
	 * @method setupUpload
	 * @params hash {object}
	 * @returns {object}
	 */
	setupUpload(hash) {
		Assert.funcNumArgs(arguments, 1, true);
		Assert.isObject(hash);

		// gets the fileObject from the hash.data object
		// that was created in the serializer.serializeIntoHash
		// The fileObject has event listeners for uploadStart,
		// uploadProgress and uploadComplete
		const fileObject = hash.data._fileObject;
		fileObject.uploadStart();

		// set the ajax complete function to trigger
		// the fileObject uploadComplete event
		hash.complete = () => {
			fileObject.uploadComplete();
		};

		// remove the _fileObject from the hash.data
		// so it doesn't get sent to the api.
		delete hash.data._fileObject;

		// convert the hash.data to a formData object
		hash.data = this.convertDataForUpload(hash.data);

		// set contentType and processData to false
		// for file uploads
		hash.contentType = false;
		hash.processData = false;

		// dont allow batch call
		hash.disableBatch = true;

		// set the xhr function to report
		// upload progress
		hash.xhr = () => {
			var xhr = Ember.$.ajaxSettings.xhr();
			xhr.upload.onprogress = (e) => {
				Ember.run.later(this, function() {
					fileObject.uploadProgress(e);
				}, 100);
			};
			return xhr;
		};
	},

	/**
	 * converts data object into a formdata object
	 *
	 * @method convertDataForUpload
	 * @params data {object}
	 * @returns {object}
	 */
	convertDataForUpload(data) {
		Assert.funcNumArgs(arguments, 1, true);
		Assert.isObject(data);

		const formData = new FormData();
		Ember.$.each(data, (key, val) => {
			if (data.hasOwnProperty(key)) {
				if (key !== 'file_url' && key !== 'file_thumb_url' && key !== 'image_url' && key !== 'image_thumb_url') {
					formData.append(key, val);
				}
			}
		});
		return formData;
	}
});
