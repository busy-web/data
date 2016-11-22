/**
 * default busy-data import
 */
import DS from 'ember-data';
import join from './utils/join';
import joinAll from './utils/join-all';
import RPCModelMixin from './mixins/rpc-model';
import FilterObject from './utils/filter-object';
import FilterArray from './utils/filter-array';

const BS = Object.assign({}, DS);

BS.RPCModel = DS.Model.extend(RPCModelMixin, {});
BS.join = join;
BS.joinAll = joinAll;
BS.FilterObject = FilterObject;
BS.FilterArray = FilterArray;

export default BS;
