/**
 * Mimics the micro-controller behaviour to help in debugging
 * provides an encoding and decoding schema
 */

"use strict";

let decodeTotal = 0;
let decodeSize = 0;
let detectionBuffer = [];
let soundPlaying = false;

// given a string to play encodes them into sound db
function encodemessage(message) {
    let sound_array = []
    for(let i = 0; i < message.length; i++) {
        sound_array.push(ENCODE[message[i]]);
    }

    console.log(sound_array);
    return sound_array;
}

// starts deciphering microcontroller input
function startDecipher() {
    startRecord();
    document.getElementById("decoded").textContent = "Decoded output: ";
    detectionBuffer = [];
    deciphering = true;
}

function stopDecipher() {
    stopRecord(true);
    deciphering = false;
}

// deciphers audio input in the same way as microcontroller
function decipher(value) {
    detectionBuffer.push(value);
    if(detectionBuffer.length > detectLength) {
        detectionBuffer.shift();
        let detectRMS = rmsCalc(detectionBuffer);

        if(!soundPlaying) {
            soundPlaying = (detectRMS > detectionSwitch);

            //make sure detectionBuffer does not trigger for at least 25 values
            if(soundPlaying) {
                detectionBuffer = Array(detectLength).fill(Number.MAX_VALUE);
            }
        } else if(detectRMS < detectionSwitch) {
            soundPlaying = false;
            let decodeRMS = decodeTotal / decodeSize;
            console.log(`decode total ${decodeTotal} decode Size ${decodeSize}`)
            let letter = findLetter(decodeRMS);
            console.log("decodeRMS: " + decodeRMS + " letter: " + letter);
            let outputParagraph = document.getElementById("decoded");
            outputParagraph.textContent += letter;
            
            decodeTotal = 0;
            decodeSize = 0;
            detectionBuffer = Array(detectLength).fill(AMP_ADJUST); //reset detectionBuffer to silence
        } else {
            decodeTotal += Math.abs(AMP_ADJUST - value);
            decodeSize++;
        }
    }
}

// helper function for modified Root Mean Square calculation
function rmsCalc(buffer) {
    let RMS = 0;
        for(let i = 0; i < buffer.length; i++) {
            RMS += Math.abs(AMP_ADJUST - buffer[i]);
        }

        RMS = RMS / buffer.length;
        return RMS;
}

// given the output value finds the corresponding letter
function findLetter(rms) {
    let keys = Object.keys(DECODE);
    let foundLetter = false;
    let index = keys.length;
    let letter = "";
    while(index >= 0 && !foundLetter) {
        index--;
        let rmsFind = DECODE[keys[index]];
        foundLetter = rmsFind < rms;
    }

    if(foundLetter) letter = keys[index];

    return letter;
}