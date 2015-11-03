'use strict';

module.exports = filter;
module.exports.match = match;

function filter(array, options) {
    options = options || {};
    var result = [];

    var insensitive = options.caseSensitive ? '' : 'i';
    var keywords = options.keywords;
    if (typeof keywords === 'string') {
        keywords = keywords.split(/[ ;,\t\r\n]+/);
    }
    keywords = keywords.map(function (keyword) {
        return new RegExp(keyword, insensitive);
    });
    for (var i = 0; i < array.length; i++) {
        if (match(array[i], keywords, options.predicate || 'AND')) {
            result.push(array[i]);
        }
    }
    return result;
}

function match(element, keywords, predicate) {
    var found = false;
    if (keywords) {
        for (var i = 0; i < keywords.length; i++) {
            if (recursiveMatch(element, keywords[i])) {
                if (predicate === 'OR') {
                    return true;
                }
                found = true;
            } else if (predicate === 'AND') {
                return false;
            }
        }
    }
    return found;
}

function recursiveMatch(element, keyword) {
    if (typeof element === 'object') {
        if (Array.isArray(element)) {
            for (var i = 0; i < element.length; i++) {
                if (recursiveMatch(element[i], keyword)) {
                    return true;
                }
            }
        } else {
            for (var i in element) {
                if (recursiveMatch(element[i], keyword)) {
                    return true;
                }
            }
        }
    } else if (typeof element === 'string') {
        return keyword.test(element);
    } else if (typeof element === 'number') {
        return keyword.test(String(element));
    }
    return false;
}
