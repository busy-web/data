
import EmberObject from '@ember/object';
import { isEmpty, isNone } from '@ember/utils';

const BusyError = EmberObject.extend();

BusyError.reopenClass({
	normalizeAdapterError(title="ERROR", status=0, code=0, detail='') {
		status = parseInt(status, 10);

		if (code) {
			if (!status) {
				status = 400;
			}
			code = parseInt(code, 10);
		}

		return { status, title, code, detail };
	},

	parseAdapterErrors(type, status, codes, details) {
		codes = isNone(codes) ? [] : codes;
		details = isNone(details) ? [] : details;

		let errs = [];
		if (!isEmpty(codes)) {
			codes.forEach((code, idx) => {
				errs.push(this.normalizeAdapterError(type, status, code, details[idx]));
			});
		} else if (!isEmpty(details)) {
			codes.forEach((code, idx) => {
				errs.push(this.normalizeAdapterError(type, status, code, details[idx]));
			});
		} else {
			errs.push(this.normalizeAdapterError(type, status));
		}
		return errs;
	}
});

export default BusyError;
