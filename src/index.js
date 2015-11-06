'use strict';

module.exports = filter;
module.exports.match = match;

var operators = require('./operators');

function filter(array, options) {
    options = options || {};
    var result = [];

    var insensitive = options.caseSensitive ? '' : 'i';
    var keywords = options.keywords;
    if (typeof keywords === 'string') {
        keywords = keywords.split(/[ ;,\t\r\n]+/);
    }
    keywords = keywords.map(function (keyword) {
        var criterion = {
            is: false,
            key: false,
            negate: false,
            valueReg: undefined
        };

        if (keyword.charAt(0) === '-') {
            criterion.negate = true;
            keyword = keyword.substring(1);
        }
        var colon = keyword.indexOf(':');
        if (colon > -1) {
            var value = keyword.substring(colon + 1);
            if (colon > 0) {
                var key = keyword.substring(0, colon);
                if (key === 'is') {
                    criterion.is = new RegExp('^' + value + '$', insensitive);
                }
                criterion.key = key;
            }
            fillCriterion(criterion, value, insensitive);
        } else {
            fillCriterion(criterion, keyword, insensitive);
        }

        return criterion;
    });
    for (var i = 0; i < array.length; i++) {
        if (match(array[i], keywords, options.predicate || 'AND')) {
            result.push(array[i]);
        }
    }
    return result;
}

function fillCriterion(criterion, keyword, insensitive) {
    var reg = new RegExp(keyword, insensitive);
    criterion.checkString = function (str) { return reg.test(str) };

    var match = /(<|<=|=|>=|>|\.\.)?(\d+)(?:(\.\.)(\d*))?/.exec(keyword);
    var checkNumber = returnFalse;
    if (match) {
        var operator = match[1];
        var mainNumber = parseFloat(match[2]);
        var dots = match[3];
        var otherNumber = match[4];
        if (operator) {
            checkNumber = operators[operator](mainNumber);
        } else if (dots) {
            if (otherNumber !== '') {
                otherNumber = parseFloat(otherNumber);
                checkNumber = function (other) {
                    return mainNumber <= other && other <= otherNumber;
                };
            } else {
                checkNumber = operators['>='](mainNumber);
            }
        } else {
            checkNumber = operators['='](mainNumber);
        }
    }

    criterion.checkNumber = checkNumber;
}

function match(element, keywords, predicate) {
    var found = false;
    if (keywords) {
        for (var i = 0; i < keywords.length; i++) {
            // match XOR negate
            if (recursiveMatch(element, keywords[i]) ? !keywords[i].negate : keywords[i].negate) {
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

function recursiveMatch(element, keyword, key) {
    if (typeof element === 'object') {
        if (Array.isArray(element)) {
            for (var i = 0; i < element.length; i++) {
                if (recursiveMatch(element[i], keyword)) {
                    return true;
                }
            }
        } else {
            for (var i in element) {
                if (recursiveMatch(element[i], keyword, i)) {
                    return true;
                }
            }
        }
    } else if (key && keyword.is && keyword.is.test(key)) {
        return !!element;
    } else if (!keyword.is) {
        if (key && keyword.key && key !== keyword.key) return false;
        return nativeMatch(element, keyword);
    }
    return false;
}

function nativeMatch(element, keyword) {
    if (typeof element === 'string') {
        return keyword.checkString(element);
    } else if (typeof element === 'number') {
        return keyword.checkNumber(element);
    } else {
        return false;
    }
}

function returnFalse() {
    return false;
}
