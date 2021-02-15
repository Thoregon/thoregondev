/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

/**
 * simply check if a given object is a function
 * @param obj
 * @return {boolean}
 */
export const isFunction    = (obj) => typeof(obj) === 'function';

/**
 *
 * @param {object} obj - any JS object
 * @returns {string} classname
 */
export const className = obj => Object.getPrototypeOf(obj).constructor.name;

/**
 * lopps async over a collection
 * @param collection
 * @param fn                async function
 * @return {Promise<void>}
 */
export const forEach = async (collection, fn) => {
    if (!collection || !Array.isArray(collection)) return ;
    for (let index = 0; index < collection.length; index++) {
        await fn(collection[index], index, collection);
    }
};

