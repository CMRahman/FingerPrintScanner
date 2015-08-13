"use strict";

var DEBUG = true; //--set the DEBUG switch

(function (window) {

    var uuid = "00001101-0000-1000-8000-00805F9B34FB";   // Sagem FP Scanner
    var address = "00:06:66:68:02:6A";

})(window);

var APP = (function () {

    var msg = "";
    var fps;
    var ctrlFPS;    //-- the FPS facade
    var fpData;     //-- this holds the minutiae data received during FPScan

    var init = function (autoConnect) {
        fpData = [];
        ctrlFPS = APPController.getInstance();
        if (autoConnect) {
            connect();
        }
    };

    var connect = function () {
        ctrlFPS.connect().then(
            function (success) {
                "use strict";
                msg = ctrlFPS.message.success;
                console.log(`APP Success: ${msg}`);
            },
            function (error) {
                "use strict";
                msg = ctrlFPS.message.error;
                console.error(`APP Error: ${msg}`);
            }
        );
    };

    var disconnect = function () {
        ctrlFPS.disconnect().then(function (success) {
            console.log(ctrlFPS.message.success);
        });
    };

    var printString = function () {
        ctrlFPS.printString("Hello World!").then(function(success) {
            console.log(`APP > Print Text Command : ${success}`);
        }, function(error) {
            console.error(`APP > Print Text Command : "${error}"`);

        });

    };

    var sendPaperFeedCommand = function () {
        ctrlFPS.sendPaperFeedCommand().then(function (success) {
            console.log(`APP > Paper Feed Command : ${success}`);
        }, function (error) {
            console.error(`APP > Paper Feed Command : "${error}"`);
        });
    };

    var exitFPSMode = function () {
        ctrlFPS.exitFPSMode().then(function (success) {
            console.log(`APP > Exit FPS Mode : ${success}`);
        }, function (error) {
            console.error(`APP > Exit FPS Mode : "${error}"`);
        });
    };

    var enterFPSMode = function () {
        ctrlFPS.enterFPSMode().then(function (success) {
            console.log(`APP > Enter FPS Mode : ${success}`);
        }, function (error) {
            console.error(`APP > Enter FPS Mode : "${error}"`);
        });
    };

    var scanFP = function () {
        //ctrlFPS.scanFP();
        console.group("APP > Scan FP >>>");
        ctrlFPS.scanFP().then(function (success) {
            console.log(`APP > Scan FP : Received minutiae data successfully`);
            console.groupEnd();
        }, function (error) {
            console.error(`APP > Scan FP : "${error}"`);
            console.groupEnd();
        });


    };
    var verifyFP = function () {
        console.group("APP > Verify FP >>>");
        ctrlFPS.verifyFP().then(function (success) {
            console.log(`APP > FP Verified > ${success}`);
            console.groupEnd();
        }, function (error) {
            console.error(`APP > Verify FP Error: "${error}"`);
            console.groupEnd();
        });
    };

    return {
        initialize: init,
        connectToDevice: connect,
        disconnectDevice: disconnect,
        sendPaperFeedCommand: sendPaperFeedCommand,
        printString: printString,
        enterFPSMode: enterFPSMode,
        scanFP: scanFP,
        verifyFP: verifyFP,
        exitFPSMode: exitFPSMode
    }


})();


window.addEventListener('DOMContentLoaded', function () {
    //console.log("Dom Loaded");
    APP.initialize(true);

    $$('#connect').addEventListener('click', APP.connectToDevice);
    $$('#disconnect').addEventListener('click', APP.disconnectDevice);
    $$('#send2').addEventListener('click', APP.sendPaperFeedCommand);
    $$('#scanMode').addEventListener('click', APP.enterFPSMode);
    $$('#scanCmd').addEventListener('click', APP.scanFP);
    $$('#verifyCmd').addEventListener('click', APP.verifyFP);
    $$('#printMode').addEventListener('click', APP.exitFPSMode);
    $$('#print').addEventListener('click', APP.printString);


    /*
     $$('#findDevices').addEventListener('click', discoverDevices);
     $$('#findDevice').addEventListener('click', getDevice());

     // $$('#send2').addEventListener('click', setDiagnostics);

     $$('#pause').addEventListener('click', pauseSocket);
     $$('#unPause').addEventListener('click', unPauseSocket);
     */

});
