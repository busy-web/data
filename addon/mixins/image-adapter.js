/**
 * @module Mixins
 *
 */
import $ from 'jquery';
import { later } from '@ember/runloop';
import { merge } from '@ember/polyfills';
import { isNone } from '@ember/utils';
import { get, set } from '@ember/object';
import Mixin from '@ember/object/mixin';

/**
 * `BusyData/Mixins/ImageAdapter`
 *
 * @class ImageAdapter
 * @namespace BusyData.Mixins
 * @extends Mixin
 */
export default Mixin.create({
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
	ajaxOptions(url, type, options) {
		options = options || {};

		const data = merge({}, get(options, 'data'));
		const isFile = !isNone(get(options, 'data._fileObject'));
		const hash = this._super(...arguments);

		if (isFile) {
			set(hash, 'data', data);
			this.setupUpload(hash);
		}

		return hash;
	},

	// _requestToJQueryAjaxHash(request) {
	//   request = request || {};

	//   const isFile = !isNone(get(request, 'data._fileObject'));
	//   if (isFile) {
	//     request.headers.Accept = 'application/json; charset=utf-8';
	//   }

	//   const hash = this._super(request) || {};

	//   if (isFile) {
	//     this.setupUpload(hash);
	//   }

	//   return hash;
	// },

	/**
	 * set up the ajax call for a file upload
	 *
	 * @private
	 * @method setupUpload
	 * @params hash {object}
	 * @returns {object}
	 */
	setupUpload(hash) {
		// gets the fileObject from the hash.data object
		// that was created in the serializer.serializeIntoHash
		// The fileObject has event listeners for uploadStart,
		// uploadProgress and uploadComplete
		const fileObject = get(hash, 'data._fileObject');
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
		set(hash, 'data', this.convertDataForUpload(hash.data));

		// set contentType and processData to false
		// for file uploads
		set(hash, 'contentType', false);
		set(hash, 'processData', false);

		// dont allow batch call
		set(hash, 'disableBatch', true);

		// set the xhr function to report
		// upload progress
		set(hash, 'xhr', () => {
			const xhr = $.ajaxSettings.xhr();
			set(xhr, 'upload.onprogress', (e) => {
				later(this, function() {
					fileObject.uploadProgress(e);
				}, 100);
			});
			return xhr;
		});
	},

	/**
	 * converts data object into a formdata object
	 *
	 * @method convertDataForUpload
	 * @params data {object}
	 * @returns {object}
	 */
	convertDataForUpload(data) {
		const formData = new FormData();
		$.each(data, (key, val) => {
			if (data.hasOwnProperty(key)) {
				if (key !== 'file_url' && key !== 'file_thumb_url' && key !== 'image_url' && key !== 'image_thumb_url') {
					formData.append(key, val);
				}
			}
		});
		return formData;
	}
});
