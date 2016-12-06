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
	/**
	 * sets up the parameters for the ajax call
	 *
	 * @private
	 * @method ajaxOptions
	 * @param url {string}
	 * @param type {object} model type
	 * @param options {object} data options
	 * @returns {object} ajax call object
	 */
	ajaxOptions(url, type, options={}) {
		// get a file object if it exists.
		const fileObject = Ember.get(options, 'data._fileObject');

		// if the fileObject exists then change the type to GET to avoid
		// ember data changing the data structure.
		let _type = type;
		if (!Ember.isNone(fileObject)) {
		 	_type = 'GET';
		}

		// let ember data add ajaxOptions
		const hash = this._super(url, _type, options);

		// if type was changed then reset type
		// to what it was meant to be.
		if (_type !== type) {
			hash.type = type;
		}

		// set up the content type and data object
		//
		// if _fileObject is set then set up a file upload
		// else if type is post set up POST content and data object
		// otherwise the data and content are left alone
		if (!Ember.isNone(fileObject)) {
			this.setupUpload(hash);
		}
		return hash;
	},

	/**
	 * set up the ajax call for a file upload
	 *
	 * @private
	 * @method setupUpload
	 * @param hash {object}
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
	 * @param data {object}
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
