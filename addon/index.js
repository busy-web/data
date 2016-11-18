/**
 * default busy-data import
 */
import DS from 'ember-data';
import join from './utils/join';
import joinAll from './utils/join-all';
import RPCModelMixin from './mixins/rpc-model';

const BS = Object.assign({}, DS);

BS.RPCModel = DS.Model.extend(RPCModelMixin, {});
BS.join = join;
BS.joinAll = joinAll;

export default BS;
