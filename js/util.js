/**
 * Created by cmrahman on 7/26/15.
 */

"use strict";


var Util = (function () {

    var convertArrayBufferToHexString = function (buf) {
        var dumpString = '[';
        var charArray = new Uint8Array(buf);
        for (var i = 0; i < charArray.length; i++) {
            dumpString += _.padLeft(charArray[i].toString(16).toUpperCase(), 2, "0");
            if (i < charArray.length - 1) dumpString += ', ';
        }
        dumpString += ']';
        return dumpString;
    };

    var convertToHexStringArray = function (dataArray) {
        var temp = [];
        [].forEach.call(dataArray, function (item) {
            temp.push(_.padLeft(item.toString(16).toUpperCase(), 2, "0"));
        });
        return temp.toString();
    };

    var convertValueToHexString = function (value) {
        _.padLeft(Number(value).toString(16).toUpperCase(), 2, "0");
    };

    var delay = function (ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        });
    };

    var timeout = function (ms, promise) {
        return new Promise(function (resolve, reject) {
            promise.then(resolve);
            setTimeout(function() {
                reject(new Error(`Timeout after ${ms} ms`));
            }, ms);
        });
    };


    return {
        convertArrayBufferToHexString: convertArrayBufferToHexString,
        convertToHexStringArray: convertToHexStringArray,
        convertValueToHexString: convertValueToHexString,
        delay: delay,
        timeout: timeout

    }

})();


