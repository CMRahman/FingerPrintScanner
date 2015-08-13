/**
 * Created by cmrahman on 7/26/15.
 */

"use strict";


var FPScanHelper = (function () {

    var RC;


    var init = function () {

    };

    var prepareFPCommandPacket = function (RC) {
        var unStuffedData = [];
        var data = FPConstants.SAGEM_INIT;
        var stuffedData = [];

        var command = [];

        unStuffedData[0] = RC;
        unStuffedData = unStuffedData.concat(data);

        var CRC = calculateCRC(data);
        unStuffedData.push(CRC[0]);
        unStuffedData.push(CRC[1]);
        stuffedData = _stuff(unStuffedData);

        command[0] = FPConstants.STX;
        command[1] = FPConstants.PACKET_ID;

        command = command.concat(stuffedData);
        command.push(FPConstants.DLE);
        command.push(FPConstants.ETX);

        var commandPacket = new Uint8Array(command);
        DEBUG && console.log(`Command Packet for FP Scan > ${Util.convertArrayBufferToHexString(commandPacket.buffer)}`);
        //02     61     01       21           0C 00            00 0F 00 00 01 01 00 FF 38 01 00 6E   7A 18   1B     03
        //STX  PAC_ID   RC   Enroll Cmd     Data Length[12]              DATA                         CRC    DLE    ETX
        return commandPacket;


    };

    var prepareFPVerifyPacket = function (minutiaeData, RC) {
        var command = [];

        var HEDR = [0x0F, 0x00, 0x05, 0x00, 0x00, 0x3F, 0x00, 0x00];
        var ISOTemp = [0x40, 0x02, 0x00, 0xFF, 0x01, 0x6E];
        var formattedPacket = [];

        /*
         Final Packet Format >> STX + PacketID + RC + Verify_Command(0x20) + Len1 + Len0 + HEDR
         + ISOTemp + Minut. Len 1 + Minut Len 0 + Minut Data
         */
        var minDataLength = _calculateLength(minutiaeData.length);
        ISOTemp.push(minDataLength[0]);
        ISOTemp.push(minDataLength[1]);
        DEBUG && console.log(`1 >> ISOTemp[] after concat minutiaeDataLength > ${Util.convertArrayBufferToHexString(ISOTemp)}`);

        //-- now concat minutiae data in command and calculate length
        //var arrHEDRandLength = HEDR.concat(totalDataLength);
        command = ISOTemp.concat(minutiaeData);     //-- Now command = [ISOTemp + minDataLength + Min. data]
        var dataLength2 = _calculateLength(command.length);
        HEDR[6] = dataLength2[0];
        HEDR[7] = dataLength2[1];
        command = HEDR.concat(command);     //-- Now command =  [HEDR + ISOTemp + minDataLength + Min. data]]
        DEBUG && console.log(`2 >> command[] after concat HEDR & dataLength2 > ${Util.convertArrayBufferToHexString(command)}`);

        //--now calculate length again and add that to command
        var dataLength3 = _calculateLength(command.length);
        command.unshift(dataLength3[1]);
        command.unshift(dataLength3[0]); //-- Now command =  [Len + HEDR + ISOTemp + minDataLength + Min. data]]
        command.unshift(Number(0x20));  //-- Now command =  [Verify Cmd + Len + HEDR + ISOTemp + minDataLength + Min. data]]

        //--now calculate CRC
        var crc = calculateCRC(command);
        //--add crc to the end
        command.push(crc[0]);
        command.push(crc[1]);
        DEBUG && console.log(`3 >> command[] after concat 0x20 + Len + .... + CRC > ${Util.convertArrayBufferToHexString(command)}`);
        //--add RC and do Stuffing
        command.unshift(RC);
        command = _stuff(command);
        DEBUG && console.log(`4 >> command[] after stuffing > ${Util.convertArrayBufferToHexString(command)}`);

        //-- now add STX + PAC_ID in the front and DLE + ETX at the end
        command.unshift(FPConstants.PACKET_ID);
        command.unshift(FPConstants.STX);
        command.push(FPConstants.DLE);
        command.push(FPConstants.ETX);
        //DEBUG && console.log(`5 >> Final >> command[] to be sent > ${Util.convertArrayBufferToHexString(command)}`);

        var commandPacket = new Uint8Array(command);
        DEBUG && console.log(`Command Packet for FP Verify >> ${Util.convertArrayBufferToHexString(commandPacket.buffer)}`);

        return commandPacket;

    };

    var prepareACKCommandPacket = function (RC) {
        var ACKPacket = [];
        var stuffedRC = _stuff(RC);
        ACKPacket[0] = FPConstants.STX;
        ACKPacket[1] = 0x62;
        stuffedRC.forEach(function (val) {
            ACKPacket.push(val);
        });
        return new Uint8Array(ACKPacket);
    };

    var prepareNACKCommandPacket = function (RC) {
        var NACKPacket = [];
        var stuffedRC = _stuff(RC);
        NACKPacket[0] = FPConstants.STX;
        NACKPacket[1] = 0x64;
        stuffedRC.forEach(function (val) {
            NACKPacket.push(val);
        });
        return new Uint8Array(NACKPacket);

    };


    var calculateCRC = function (data) {
        var crc = [];
        var index = 0;
        for (var i = 0, len = data.length; i < len; i++) {
            index = crc[1] ^ data[i] & 0xFF;
            crc[1] = FPConstants.LOOKUP2[index] ^ crc[0];
            crc[0] = FPConstants.LOOKUP1[index];
        }
        // DEBUG && console.log(`CRC[0]: ${crc[0].toString(16).toUpperCase()}      CRC[1]: ${crc[1].toString(16).toUpperCase()}`);

        return crc;
    };

    function _calculateLength(len) {
        var dataLength = [];
        var int16view = new Uint16Array([len]);
        var int8View = new Uint8Array(int16view.buffer);
        dataLength[0] = int8View[0];
        dataLength[1] = int8View[1];
        return dataLength;
    }


    var _stuff = function (data) {
        var counter = 0;
        var stuffedData = [];
        for (let i = 0, j = data.length; i < j; i++) {
            var item = data[i];
            switch (item) {
                case 0x11:
                    stuffedData.splice(i, 1, 0x1B, 0x12);
                    counter++;
                    break;
                case 0x13:
                    stuffedData.splice(i, 1, 0x1B, 0x14);
                    counter++;
                    break;
                case 0x1B:
                    stuffedData.splice(i, 1, 0x1B, 0x1B);
                    counter++;
                    break;
                default:
                    stuffedData.push(item);
                    break;
            }
        }
        //  DEBUG && console.log(`StuffedData : ${data}`);
        counter && DEBUG && console.log(`Stuffed >  ${counter} time(s)`);
        return stuffedData;

    };

    var unStuff = function (data) {
        //(data.length < 5 ) && DEBUG && console.log(`unStuff method > data received > ${Util.convertToHexStringArray(data)}`);
        var unStuffedData = [];
        var counter = 0;
        for (let i = 0, j = data.length; i < j; i++) {
            switch (data[i]) {
                case 0x1B:
                    switch (data[i + 1]) {
                        case 0x12:
                            data.splice(i, 2, 0x11);
                            counter++;
                            break;
                        case 0x14:
                            data.splice(i, 2, 0x13);
                            counter++;
                            break;
                        case 0x1B:
                            data.splice(i, 2, 0x1B);
                            counter++;
                            break;
                        default:
                            break;
                    }
                    //i++;
                    break;
                default:
                    //unStuffedData.push(data[i]);
                    break;
            }
        }
        (data.length < 5 ) && DEBUG && console.log(`UnStuff method > Data Returned > ${Util.convertToHexStringArray(data)}`);
        counter && DEBUG && console.log(`UnStuffed >  ${counter} times`);

        return data;

    };

    return {

        getFPCommand: prepareFPCommandPacket,
        getFPVerifyCommand: prepareFPVerifyPacket,
        getAckCommand: prepareACKCommandPacket,
        getNackCommand: prepareNACKCommandPacket,
        unStuff: unStuff,
        calculateCRC: calculateCRC
    }


})();


var FPConstants = (function () {

    const STX = 0x02;
    const ETX = 0x03;
    const DLE = 0x1B;
    const ACK = 0xE2;
    const NACK = 0xE4;
    const PACKET_ID = 0x61;
    const SAGEM_INIT = [0x21, 0x0C, 0x00,
        0x00, 0x0F, 0x00, 0x00, 0x01, 0x01, 0x00, 0xFF, 0x38, 0x01, 0x00, 0x6E];

    const LOOKUP1 = [0x00, 0x21,
        0x42, 0x63, 0x84, 0xA5, 0xC6,
        0xE7, 0x08, 0x29, 0x4A, 0x6B,
        0x8C, 0xAD, 0xCE, 0xEF, 0x31,
        0x10, 0x73, 0x52, 0xB5, 0x94,
        0xF7, 0xD6, 0x39, 0x18, 0x7B,
        0x5A, 0xBD, 0x9C, 0xFF, 0xDE,
        0x62, 0x43, 0x20, 0x01, 0xE6,
        0xC7, 0xA4, 0x85, 0x6A, 0x4B,
        0x28, 0x09, 0xEE, 0xCF, 0xAC,
        0x8D, 0x53, 0x72, 0x11, 0x30,
        0xD7, 0xF6, 0x95, 0xB4, 0x5B,
        0x7A, 0x19, 0x38, 0xDF, 0xFE,
        0x9D, 0xBC, 0xC4, 0xE5, 0x86,
        0xA7, 0x40, 0x61, 0x02, 0x23,
        0xCC, 0xED, 0x8E, 0xAF, 0x48,
        0x69, 0x0A, 0x2B, 0xF5, 0xD4,
        0xB7, 0x96, 0x71, 0x50, 0x33,
        0x12, 0xFD, 0xDC, 0xBF, 0x9E,
        0x79, 0x58, 0x3B, 0x1A, 0xA6,
        0x87, 0xE4, 0xC5, 0x22, 0x03,
        0x60, 0x41, 0xAE, 0x8F, 0xEC,
        0xCD, 0x2A, 0x0B, 0x68, 0x49,
        0x97, 0xB6, 0xD5, 0xF4, 0x13,
        0x32, 0x51, 0x70, 0x9F, 0xBE,
        0xDD, 0xFC, 0x1B, 0x3A, 0x59,
        0x78, 0x88, 0xA9, 0xCA, 0xEB,
        0x0C, 0x2D, 0x4E, 0x6F, 0x80,
        0xA1, 0xC2, 0xE3, 0x04, 0x25,
        0x46, 0x67, 0xB9, 0x98, 0xFB,
        0xDA, 0x3D, 0x1C, 0x7F, 0x5E,
        0xB1, 0x90, 0xF3, 0xD2, 0x35,
        0x14, 0x77, 0x56, 0xEA, 0xCB,
        0xA8, 0x89, 0x6E, 0x4F, 0x2C,
        0x0D, 0xE2, 0xC3, 0xA0, 0x81,
        0x66, 0x47, 0x24, 0x05, 0xDB,
        0xFA, 0x99, 0xB8, 0x5F, 0x7E,
        0x1D, 0x3C, 0xD3, 0xF2, 0x91,
        0xB0, 0x57, 0x76, 0x15, 0x34,
        0x4C, 0x6D, 0x0E, 0x2F, 0xC8,
        0xE9, 0x8A, 0xAB, 0x44, 0x65,
        0x06, 0x27, 0xC0, 0xE1, 0x82,
        0xA3, 0x7D, 0x5C, 0x3F, 0x1E,
        0xF9, 0xD8, 0xBB, 0x9A, 0x75,
        0x54, 0x37, 0x16, 0xF1, 0xD0,
        0xB3, 0x92, 0x2E, 0x0F, 0x6C,
        0x4D, 0xAA, 0x8B, 0xE8, 0xC9,
        0x26, 0x07, 0x64, 0x45, 0xA2,
        0x83, 0xE0, 0xC1, 0x1F, 0x3E,
        0x5D, 0x7C, 0x9B, 0xBA, 0xD9,
        0xF8, 0x17, 0x36, 0x55, 0x74,
        0x93, 0xB2, 0xD1, 0xF0];

    const LOOKUP2 = [0x00, 0x10,
        0x20, 0x30, 0x40, 0x50, 0x60,
        0x70, 0x81, 0x91, 0xA1, 0xB1,
        0xC1, 0xD1, 0xE1, 0xF1, 0x12,
        0x02, 0x32, 0x22, 0x52, 0x42,
        0x72, 0x62, 0x93, 0x83, 0xB3,
        0xA3, 0xD3, 0xC3, 0xF3, 0xE3,
        0x24, 0x34, 0x04, 0x14, 0x64,
        0x74, 0x44, 0x54, 0xA5, 0xB5,
        0x85, 0x95, 0xE5, 0xF5, 0xC5,
        0xD5, 0x36, 0x26, 0x16, 0x06,
        0x76, 0x66, 0x56, 0x46, 0xB7,
        0xA7, 0x97, 0x87, 0xF7, 0xE7,
        0xD7, 0xC7, 0x48, 0x58, 0x68,
        0x78, 0x08, 0x18, 0x28, 0x38,
        0xC9, 0xD9, 0xE9, 0xF9, 0x89,
        0x99, 0xA9, 0xB9, 0x5A, 0x4A,
        0x7A, 0x6A, 0x1A, 0x0A, 0x3A,
        0x2A, 0xDB, 0xCB, 0xFB, 0xEB,
        0x9B, 0x8B, 0xBB, 0xAB, 0x6C,
        0x7C, 0x4C, 0x5C, 0x2C, 0x3C,
        0x0C, 0x1C, 0xED, 0xFD, 0xCD,
        0xDD, 0xAD, 0xBD, 0x8D, 0x9D,
        0x7E, 0x6E, 0x5E, 0x4E, 0x3E,
        0x2E, 0x1E, 0x0E, 0xFF, 0xEF,
        0xDF, 0xCF, 0xBF, 0xAF, 0x9F,
        0x8F, 0x91, 0x81, 0xB1, 0xA1,
        0xD1, 0xC1, 0xF1, 0xE1, 0x10,
        0x00, 0x30, 0x20, 0x50, 0x40,
        0x70, 0x60, 0x83, 0x93, 0xA3,
        0xB3, 0xC3, 0xD3, 0xE3, 0xF3,
        0x02, 0x12, 0x22, 0x32, 0x42,
        0x52, 0x62, 0x72, 0xB5, 0xA5,
        0x95, 0x85, 0xF5, 0xE5, 0xD5,
        0xC5, 0x34, 0x24, 0x14, 0x04,
        0x74, 0x64, 0x54, 0x44, 0xA7,
        0xB7, 0x87, 0x97, 0xE7, 0xF7,
        0xC7, 0xD7, 0x26, 0x36, 0x06,
        0x16, 0x66, 0x76, 0x46, 0x56,
        0xD9, 0xC9, 0xF9, 0xE9, 0x99,
        0x89, 0xB9, 0xA9, 0x58, 0x48,
        0x78, 0x68, 0x18, 0x08, 0x38,
        0x28, 0xCB, 0xDB, 0xEB, 0xFB,
        0x8B, 0x9B, 0xAB, 0xBB, 0x4A,
        0x5A, 0x6A, 0x7A, 0x0A, 0x1A,
        0x2A, 0x3A, 0xFD, 0xED, 0xDD,
        0xCD, 0xBD, 0xAD, 0x9D, 0x8D,
        0x7C, 0x6C, 0x5C, 0x4C, 0x3C,
        0x2C, 0x1C, 0x0C, 0xEF, 0xFF,
        0xCF, 0xDF, 0xAF, 0xBF, 0x8F,
        0x9F, 0x6E, 0x7E, 0x4E, 0x5E,
        0x2E, 0x3E, 0x0E, 0x1E];


    return {
        STX: STX,
        ETX: ETX,
        DLE: DLE,
        ACK: ACK,
        NACK: NACK,
        PACKET_ID: PACKET_ID,
        LOOKUP1: LOOKUP1,
        LOOKUP2: LOOKUP2,
        SAGEM_INIT: SAGEM_INIT
    }


})();
