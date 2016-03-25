
import Ember from 'ember';

const FilterArray = Ember.ArrayProxy.extend(Ember.Enumerable);

/**
 * Private helper function to get properties from the models
 *
 * @private
 * @method getModelProperty
 * @param model {DS.Model}
 * @param key {string}
 * @return {mixed}
 */
function getModelProperty(model, key)
{
	return Ember.get(model, camelizePath(key));
}

/**
 * Private helper function to get properties from the models
 *
 * @private
 * @method setModelProperty
 * @param model {DS.Model}
 * @param key {string}
 * @param value {mixed}
 * @return {mixed}
 */
function setModelProperty(model, key, value)
{
	Ember.set(model, camelizePath(key), value);
}

/**
 * Private helper function for generating a rendom id hash
 *
 * @Private
 * @method generateId
 * @return {string}
 */
function generateId()
{
	function s4() 
	{
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}

	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function mergeObject(toObject, fromObject)
{
	for(let i in fromObject)
	{
		if(fromObject.hasOwnProperty(i))
		{
			var prop = getModelProperty(fromObject, i);
			if(!Ember.isNone(prop))
			{
				setModelProperty(toObject, i, prop);
			}
		}
	}

	return toObject;
}

function cleanArray(arr)
{
	arr = arr || [];

	return FilterArray.create({content: arr}).filter(function(item)
	{
		return !Ember.isNone(item);
	});
}

function generateModelPath()
{
	var args = arguments;
	for(let key in args)
	{
		if(args.hasOwnProperty(key) && !Ember.isNone(args[key]))
		{
			var extendedPath = args[key].split('.');
			if(extendedPath.length > 1)
			{
				args[key] = generateModelPath.apply(null, extendedPath);
			}
			else
			{
				args[key] = Ember.String.camelize(args[key]);
			}
		}
	}

	var path = cleanArray(arguments).join('.');
	
	return path;
}

function camelizePath(path)
{
	return generateModelPath.apply(null, path.split('.'));
}

export {
	getModelProperty, 
	setModelProperty, 
	generateId, 
	generateModelPath, 
	mergeObject
};

