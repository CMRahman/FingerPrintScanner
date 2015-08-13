/**
 * Created by cmrahman on 7/27/15.
 */

"use strict";


var APPController = (function () {

    function FPSController() {
        this.message = {
            success: "",
            error: ""
        };
        //this.message = "";
        BTService.init();
    }

    var instance;

    FPSController.prototype.init = function (autoConnect) {
        if (autoConnect) {
            return BTService.connect();
        }
    };

    FPSController.prototype.connect = function () {
        return BTService.connect();
    };

    FPSController.prototype.disconnect = function () {
        return BTService.disconnect();
    };

    FPSController.prototype.sendPaperFeedCommand = function () {
        return BTService.sendPaperFeedCommand();
    };

    FPSController.prototype.printString = function (str) {
        return BTService.printString(str);
    };

    FPSController.prototype.enterFPSMode = function () {
        return BTService.enterFPSMode();
    };

    FPSController.prototype.exitFPSMode = function () {
        return BTService.exitFPSMode();
    };

    FPSController.prototype.scanFP = function () {
        var inFPSMode;
        return new Promise(function(resolve, reject) {
            BTService.enterFPSMode()
                .then(function (success) {
                    inFPSMode = true;
                    DEBUG && console.log(`FPSCtrl > Enter FPS Mode : ${success}`);
                    return BTService.scanFP();
                })
                .then(function (success) {
                    //DEBUG && console.log(`FPSCtrl  > Scan FP : ${success}`);
                    return BTService.exitFPSMode();
                })
                .then(function (success) {
                    inFPSMode = false;
                    DEBUG && console.log(`FPSCtrl > Exit FPS Mode : ${success}`);
                    console.groupEnd();
                    resolve(true);
                })
                .catch(function (error) {
                    DEBUG && console.error(`FPSCtrl  > scanFP Error!! > ${error}`);
                    console.groupEnd();
                    inFPSMode && BTService.exitFPSMode();   //-- in case we got error, try to exit the FPS mode
                    reject(false);
                });

        });
    };

    FPSController.prototype.verifyFP = function () {
        //return BTService.verifyFP();
        var inFPSMode;
        return new Promise(function(resolve, reject) {
            BTService.enterFPSMode()
                .then(function (success) {
                    inFPSMode = true;
                    DEBUG && console.log(`FPSCtrl > Enter FPS Mode : ${success}`);
                    return BTService.verifyFP();
                })
                .then(function (success) {
                    DEBUG && console.log(`FPSCtrl  > Verify FP : ${success}`);
                    return BTService.exitFPSMode();
                })
                .then(function (success) {
                    inFPSMode = false;
                    DEBUG && console.log(`FPSCtrl > Exit FPS Mode : ${success}`);
                    console.groupEnd();
                    resolve(true);
                })
                .catch(function (error) {
                    DEBUG && console.error(`FPSCtrl  > scanFP Error!! > ${error}`);
                    console.groupEnd();
                    inFPSMode && BTService.exitFPSMode();   //-- in case we got error, try to exit the FPS mode
                    reject(false);
                });

        });
    };

    return {
        getInstance: function () {
            if (!instance) {
                DEBUG && console.log("Created New FPS instance");
                instance = new FPSController();
            }
            return instance;
        }
    };

})();
