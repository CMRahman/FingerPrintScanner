/**
 * Created by cmrahman on 7/26/15.
 */
"use strict";


var BTService = (function () {

    const MAC_ADDRESS = "00:06:66:68:02:6A";
    const UUID = "00001101-0000-1000-8000-00805F9B34FB";   // Sagem FP Scanner UUID
    const DEFAULT_DELAY = 1000;

    var _dataBuffer,       //-- Input buffer
        _errorBuffer,       //-- Error buffer
        _minutiaeData,      //-- Container to save finger print scan data
        _RC;                //-- The Request Counter

    var init = function () {
        this.socketId = 0;
        _RC = 0x01;
        _dataBuffer = [];
        _errorBuffer = [];
        _minutiaeData = [];

    };

    var connect = function () {
        return new Promise(function (resolve, reject) {
            chrome.bluetoothSocket.create(function (createInfo) {
                if (chrome.runtime.lastError) {
                    DEBUG && console.log(`Create failed: ${chrome.runtime.lastError.message}`);
                    APPController.getInstance().message.error = chrome.runtime.lastError.message;
                    //FPS.message = chrome.runtime.lastError.message;
                    reject(false);
                }
                else {
                    if (createInfo) {
                        this.socketId = createInfo.socketId;
                        //DEBUG && console.log(this);
                    }
                    //--register handlers for data and error
                    chrome.bluetoothSocket.onReceive.addListener(onBTDataReceived);
                    chrome.bluetoothSocket.onReceiveError.addListener(onBTErrorReceived);
                    //--connect to the BT Device
                    chrome.bluetoothSocket.connect(this.socketId, MAC_ADDRESS, UUID, function () {
                        //DEBUG && console.log(this);
                        if (chrome.runtime.lastError) {
                            DEBUG && console.log(`Connection failed: ${chrome.runtime.lastError.message}`);
                            APPController.getInstance().message.error = chrome.runtime.lastError.message;
                            //FPS.message = chrome.runtime.lastError.message;
                            reject(false);
                        } else {
                            APPController.getInstance().message.success = "Bluetooth Connection Successful";
                            //FPS.message = "Bluetooth Connection Successful";
                            resolve(true);
                        }
                    });
                }
            }.bind(this));
        }.bind(this));
    };

    var disconnect = function () {
        return new Promise(function (resolve, reject) {
            chrome.bluetoothSocket.disconnect(this.socketId, function () {
                APPController.getInstance().message.success = "Successfully disconnected";
                //FPS.message = "Successfully disconnected";
                resolve(true);
            });
        }.bind(this));
    };


    var sendPaperFeedCommand = function () {
        _dataBuffer = []; //-- reset input buffer
        var bufferView = new Uint8Array([0x8A, 0xC2, 0x04]);
        return new Promise(function (resolve, reject) {
            _sendCommandToFPS.call(this, bufferView.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY);
                })
                .then(function () {
                    if (_checkResponseByte()) {
                        resolve("Successful");
                    } else {
                        resolve("Unsuccessful!!!");
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        }.bind(this));
    };

    var printString = function (str) {
        var bufferView = [0x8A, 0xC3, 0x91];
        str = _.padRight(str, 24, " ");
        DEBUG && console.log(str.length);
        [].forEach.call(str, function(item) {
           bufferView.push(item.charCodeAt());
        });
        //-ETX
        bufferView.push(parseInt("0x04", 16));
        DEBUG && console.log(Util.convertToHexStringArray(bufferView));
        var cmd = new Uint8Array(bufferView);
        return new Promise(function (resolve, reject) {
            _sendCommandToFPS.call(this, cmd.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY);
                })
                .then(function () {
                    if (_checkResponseByte()) {
                        resolve("Successful");
                    } else {
                        resolve("Unsuccessful!!!");
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        }.bind(this));
    };


    var enterFPSMode = function () {
        //8a c9 91 04 5c
        _dataBuffer = []; //-- reset input buffer
        DEBUG && console.log(`Enter FPS Mode > Reset Buffer > ${_dataBuffer.length}`);
        var bufferView = new Uint8Array([0x8A, 0xC9, 0x91, 0x04, 0x5C]);
        return new Promise(function (resolve, reject) {
            _sendCommandToFPS.call(this, bufferView.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY)
                })
                .then(function () {
                    if (_checkResponseByte()) {
                        resolve("Successful");
                    } else {
                        resolve("Unsuccessful!!!");
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        }.bind(this));
    };

    var exitFPSMode = function () {
        // "8a c9 92 04 5f"
        _dataBuffer = []; //-- reset input buffer
        var bufferView = new Uint8Array([0x8A, 0xC9, 0x92, 0x04, 0x5F]);
        return new Promise(function (resolve, reject) {
            _sendCommandToFPS.call(this, bufferView.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY);
                })
                .then(function () {
                    if (_checkResponseByte()) {
                        resolve("Successful");
                    } else {
                        resolve("Unsuccessful!!!");
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        }.bind(this));
    };

    var scanFP = function () {
        /*
         02     61     01       21           0C 00            00 0F 00 00 01 01 00 FF 38 01 00 6E   7A 18   1B     03
         STX  PAC_ID   RC   Enroll Cmd     Data Length[12]              DATA                         CRC    DLE    ETX

         02          E2                  01        <<     {Ack for above packet from FPS}
         STX    Response from FPS         RC
         */
        _dataBuffer = []; //-- reset input buffer
        var cmdPacket = FPScanHelper.getFPCommand(_RC);
        return new Promise(function (resolve, reject) {
            var self = this;
            var dataOnly = [];
            _sendCommandToFPS.call(self, cmdPacket.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY);
                })
                .then(function () {
                    var positive = _checkFPSResponse(_RC);
                    if (positive) {
                        return Util.delay(DEFAULT_DELAY);
                    } else {
                        reject("No ACK received from FPS!!!");
                    }
                })
                .then(function () {
                    var _respData = _extractFPSDataPacket();
                    if (_respData) {
                        var unStuffedDataCRC = _respData.unStuffedDataCRC;
                        var unStuffedPacketCRC = _respData.unStuffedPacketCRC;
                        var rcByte = _respData.rcByte;
                        dataOnly = _respData.data;

                    } else {
                        DEBUG && console.log("No data extracted from FPS Response > aborting scanFP");
                        reject("No Data found in FPS response");
                    }

                    //-- here check CRC and if matches send ACK to FPS
                    var validCRC = _validateCRC(unStuffedDataCRC, unStuffedPacketCRC);
                    var cmd;
                    if (validCRC) {
                        cmd = FPScanHelper.getAckCommand(rcByte);
                    }
                    else {
                        cmd = FPScanHelper.getNackCommand(rcByte);
                    }
                    return _sendCommandToFPS.call(self, cmd.buffer);
                })
                .then(function () {
                    //DEBUG && console.log(">> ACK/NACK command sent Successfully from scanFP method");
                    //-- extract Minutiae now
                    // At present >  dataOnly = Enroll Cmd + Len 2 + Len 1 + Data
                    var enrollCommandCode = dataOnly.slice(0, 1);
                    DEBUG && console.log(`Enroll Command Code > ${Util.convertToHexStringArray(enrollCommandCode)}`);
                    var lengthOfData = dataOnly.slice(1, 3);
                    DEBUG && console.log(`Data Length > ${Util.convertToHexStringArray(lengthOfData)}`);
                    var isoTemplateCode = dataOnly.indexOf(Number("0x6E"));
                    var minutiaeDataLength = dataOnly.slice(isoTemplateCode + 1, isoTemplateCode + 3); //-- ... 6E F0 00 ...
                    DEBUG && console.log(`Minutiae Data Length > ${Util.convertToHexStringArray(minutiaeDataLength)}`);

                    _minutiaeData = dataOnly.slice(isoTemplateCode + 3); //--Template Code + Len 1 + Len 2
                    DEBUG && console.log(`Minutiae Data Length> ${_minutiaeData.length}`);
                    DEBUG && console.log(`Minutiae Data > ${Util.convertToHexStringArray(_minutiaeData)}`);
                    resolve(_minutiaeData);
                })
                .catch(function (error) {
                    DEBUG && console.log(" >> Error in scanFP method <<");
                    reject(error);
                });
        }.bind(this));

    };

    var verifyFP = function () {
        _dataBuffer = []; //-- reset input buffer
        var cmdPacket = FPScanHelper.getFPVerifyCommand(_minutiaeData, _RC);
        return new Promise(function (resolve, reject) {
            var self = this;
            var dataOnly = [];
            _sendCommandToFPS.call(self, cmdPacket.buffer)
                .then(function () {
                    return Util.delay(DEFAULT_DELAY);
                })
                .then(function () {
                    var positive = _checkFPSResponse(_RC);
                    if (positive) {
                        return Util.delay(DEFAULT_DELAY);
                    } else {
                        reject("No ACK received from FPS!!!");
                    }
                })
                .then(function () {
                    var _respData = _extractFPSDataPacket();
                    if (_respData) {
                        var unStuffedDataCRC = _respData.unStuffedDataCRC;
                        var unStuffedPacketCRC = _respData.unStuffedPacketCRC;
                        var rcByte = _respData.rcByte;
                        dataOnly = _respData.data;

                    } else {
                        DEBUG && console.log("No data extracted from FPS Response > aborting scanFP");
                        reject("No Data found in FPS response");
                    }
                    //-- here check CRC and if matches send ACK to FPS
                    var validCRC = _validateCRC(unStuffedDataCRC, unStuffedPacketCRC);
                    var cmd;
                    if (validCRC) {
                        cmd = FPScanHelper.getAckCommand(rcByte);
                    }
                    else {
                        cmd = FPScanHelper.getNackCommand(rcByte);
                    }
                    return _sendCommandToFPS.call(self, cmd.buffer);
                })
                .then(function () {
                    var matchingResult = dataOnly.slice(4);
                    DEBUG && console.log(`Data Length > ${Util.convertToHexStringArray(matchingResult)}`);
                    if (matchingResult[0] === Number(0x01)) {
                        console.log("VERIFY > WE HAVE A MATCH");
                        resolve(true);
                    }
                    else {
                        console.log("VERIFY > NO MATCH");
                        resolve(false);
                    }
                })
                .catch(function (error) {
                    DEBUG && console.log(" >> Error in scanFP method <<");
                    reject(error);
                });

        }.bind(this));
    };

    var _sendCommandToFPS = function (buffer) {
        return new Promise(function (resolve, reject) {
            chrome.bluetoothSocket.send(this.socketId, buffer, function () {
                if (chrome.runtime.lastError) {
                    console.error(`_sendCommandToFPS failed > ${chrome.runtime.lastError.message}`);
                    reject(chrome.runtime.lastError.message);
                }
                else {
                    //DEBUG && console.log('_sendCommandToFPS successful!!');
                    resolve(true);
                }
            })
        }.bind(this));
    };

    var _checkResponseByte = function () {
        var response = [];
        if (_dataBuffer.length) {
            DEBUG && console.log(`_dataBuffer length before shift > ${_dataBuffer.length}`);
            response.push(_dataBuffer.shift());
            DEBUG && console.log(`response > ${Number(response).toString(2)}`);
            DEBUG && console.log(`_dataBuffer length after shift > ${_dataBuffer.length}`);
            if (response[0].toString(16) == "80") {
                return true;
            } else {
                DEBUG && console.log("Unsuccessful!!! > Error Code Returned in Response");
                return false;
            }
        }
        else {
            resolveDEBUG && console.log("No Response received for enterFPS");
            return false;
        }
    };

    var _checkFPSResponse = function (RC) {
        var respArray = [];
        DEBUG && console.log(`Inside _checkResponse > _dataBuffer length >  ${_dataBuffer.length}`);
        if (_dataBuffer.length && _dataBuffer.length >= 3) {
            DEBUG && console.log(`_checkFPSResponse >> dataBuffer DUMP >> ${Util.convertToHexStringArray(_dataBuffer)}`);
            for (let i = 0; i < 3; i++) {
                respArray.push((_dataBuffer.shift()));
            }
        }
        DEBUG && console.log(`Response received > Length > ${respArray.length} > Data > ${Util.convertToHexStringArray(respArray)}`);
        DEBUG && console.log(`_DataBuffer length > after 3 shifts > ${_dataBuffer.length}`);

        //--now validate
        var unStuffedRC = FPScanHelper.unStuff(respArray.slice(2));
        if (respArray[1] === FPConstants.ACK && unStuffedRC[0] === RC) {
            DEBUG && console.log("FP SCAN> Got ACK!!!");
            _RC++;      //-- Increment Request Counter
            return true;
        }
        return false;
    };

    var _extractFPSDataPacket = function () {
        if (_dataBuffer.length) {
            DEBUG && console.log(`__extractFPSDataPacket >> dataBuffer DUMP >> ${Util.convertToHexStringArray(_dataBuffer)}`);
            var indexSTX = _dataBuffer.indexOf(FPConstants.STX);
            var indexETX = _dataBuffer.lastIndexOf(FPConstants.ETX);
            DEBUG && console.log(`indexSTX > ${indexSTX} <> indexETX > ${indexETX}`);
            if (indexSTX !== -1 && indexETX !== -1 && indexETX > indexSTX) {
                var fullDataPacket = _dataBuffer.slice(indexSTX, indexETX + 1);//STX PACID [RC DATA CRC1 CRC2]DLE ETX
                DEBUG && console.log(`fullDataPacket > ${Util.convertToHexStringArray(fullDataPacket)}`);
                var packetId = fullDataPacket.slice(1, 2); // fullDataPacket[1];
                DEBUG && console.log(`PAC_IC > ${Util.convertToHexStringArray(packetId)}`);
                var packetToBeUnStuffed = fullDataPacket.slice(2, fullDataPacket.length - 2); //-- remove STX PAC_ID ... DLE ETX
                DEBUG && console.log(`packet to be unStuffed > ${Util.convertToHexStringArray(packetToBeUnStuffed)}`);
                var packetCRCArray = packetToBeUnStuffed.slice(packetToBeUnStuffed.length - 2); //-- Last 2 are CRC
                DEBUG && console.log(`packetCRCArray > ${Util.convertToHexStringArray(packetCRCArray)}`);
                var unStuffedPacketCRC = FPScanHelper.unStuff(packetCRCArray);
                DEBUG && console.log(`unStuffedPacketCRC > ${Util.convertToHexStringArray(unStuffedPacketCRC)}`);

                var unStuffed = FPScanHelper.unStuff(packetToBeUnStuffed); // [RC DATA CRC1 CRC2]
                DEBUG && console.log(`UnStuffed Packet > ${Util.convertToHexStringArray(unStuffed)}`);
                var rcByte = unStuffed.slice(0, 1);
                DEBUG && console.log(`RC received in data packet > ${Util.convertToHexStringArray(rcByte)}`);

                //--calculate CRC for the DATA part
                var data = unStuffed.slice(1, unStuffed.length - 2); //-- Remove RC + CRC1 + CRC2
                DEBUG && console.log(`Data only > ${Util.convertToHexStringArray(data)}`);
                var unStuffedDataCRC = FPScanHelper.calculateCRC(data);
                DEBUG && console.log(`unStuffedData CRC > ${Util.convertToHexStringArray(unStuffedDataCRC)}`);
                return {
                    unStuffedDataCRC: unStuffedDataCRC,
                    unStuffedPacketCRC: unStuffedPacketCRC,
                    rcByte: rcByte,
                    data: data
                };
            } else {
                DEBUG && console.log("_extractFPSDataPacket > Couldn't find the proper STX & ETX in FPSDataPacket");
                return null;
            }
        }

    };

    var _validateCRC = function (dataCRC, packetCRC) {
        return (dataCRC[0] === packetCRC[0] && dataCRC[1] === packetCRC[1]);
    };

    var onBTDataReceived = function (info) {
        //DEBUG && console.log(`Received ${info.data.byteLength} bytes: ${Util.convertArrayBufferToHexString(info.data)}`);
        var temp = new Uint8Array(info.data);
        [].forEach.call(temp, function (val) {
            _dataBuffer.push(val);
        });
    };

    var onBTErrorReceived = function (errorInfo) {
        DEBUG && console.log(`Receive BT Error > ${errorInfo.error} > ${errorInfo.errorMessage}`);
    };


    return {
        init: init,
        disconnect: disconnect,
        connect: connect,

        enterFPSMode: enterFPSMode,
        exitFPSMode: exitFPSMode,
        scanFP: scanFP,
        verifyFP: verifyFP,

        printString: printString,
        sendPaperFeedCommand: sendPaperFeedCommand
    }

})();

