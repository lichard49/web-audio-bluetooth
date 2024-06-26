/**
 * Contains all sound playing functionality for 
 * Web-Audio-Bluetooth Project
 */


// for recording and analyzing files
let decode_files = []
let sound_files = []
let sound_start_time = []
let sound_end_time = []

//
let soundIsPlaying = false;

// testing values
let time_start = 0;
let time_end = 0;

function initSound() {
  let context = (window.AudioContext || window.webkitAudioContext) ?
    new (window.AudioContext || window.webkitAudioContext)() : null;

  // Decide on some parameters
  let allowBackgroundPlayback = false; // default false, recommended false
  let forceIOSBehavior = false; // default false, recommended false
  // Pass it to unmute if the context exists... ie WebAudio is supported
  if (context)
  {
    // If you need to be able to disable unmute at a later time, you can use the returned handle's dispose() method
    // if you don't need to do that (most folks won't) then you can simply ignore the return value
    let unmuteHandle = unmute(context, allowBackgroundPlayback, forceIOSBehavior);

  }
}

// plays a straight drone
function makelongsound(){
  initSound();

  if(soundIsPlaying) {
    console.log("cannot play two sounds at once");
    return;
  }

  soundIsPlaying = true;

  Tone.start().then(() => {
  osc.start();

  const slide = document.getElementById("myRange");
  let sliderDiv = document.getElementById("sliderAmount");

  slide.oninput = function() {
    sliderDiv.innerHTML = this.value;
    osc.volume.value = this.value;
  }
  })
}

// plays a sound at dbLevel dbs, numSamples times
function testPlay(dbLevel, numSamples) {
    startRecord();
    setTimeout(() => stopRecord(true), RECORD_LENGTH * 1000);
    volumes = new Array(numSamples)
    volumes.fill(dbLevel)
    playMessage(volumes);

}

// given a string input in html element textPlay, plays out the encoded sound
function playEncoding() {
  initSound();

  Tone.start().then(() => {
    let message = document.getElementById("textPlay").value;
    let sound_message = encodemessage(message);
    console.log(sound_message);
    playMessage(sound_message);
  });
}

async function num_outputTest(num) {
  const letters =  await csvConverter(window.location.origin + "/" + INPUT_TEST_PATH);
  console.log("letters to decode: \n" + letters);
  const values = encodemessage(letters);

  for (let i = 0; i < num; i++) {
    console.log("starting test: " + i);
    await outputTest(values, i);
  }

  // get the ZIP stream in a Blob
  const blob1 = await downloadZip(sound_files).blob()
  const blob2 = await downloadZip(decode_files).blob()
  // make and click a temporary link to download the Blob
  const link1 = document.createElement("a")
  link1.href = URL.createObjectURL(blob1)
  link1.download = "sound_files.zip"
  link1.click()
  link1.remove()
  URL.revokeObjectURL(link1.href)

  const link2 = document.createElement("a")
  link2.href = URL.createObjectURL(blob2)
  link2.download = "decode_files.zip"
  link2.click()
  link2.remove()
  URL.revokeObjectURL(link2.href)

  sound_files = [];
  decode_files = [];

}

// using a test csv file with output letters to play compares expected output on microcontroller vs actual ouput
async function outputTest(values, iteration) {
  output_testing = true;
  const date = new Date();
  startRecord();
  playMessage(values);

  const delay = ms => new Promise(res => setTimeout(res, ms));
  while (soundIsPlaying) {
    await delay(50);
  }

  let record_stream = stopRecord(false);
  output_testing = false;
  console.log("expected end time: " + playTime(values));
  const csvString = ((output) => {
    let csvString = "";
    for(let i = 0; i < output.length - 1; i++) {
      csvString += output[i] + ",\r\n";
    }

    csvString += output[output.length - 1];
    return csvString;
  });

  // give data a chance to catch up
  await(delay(100));
  const letters_csv = csvString(output_letters);
  const record_csv = csvString(record_stream);
  const file_letters = new File([letters_csv], `file_letter_${iteration}.csv`, { type: 'text/csv' }); 
  const file_soundstream = new File([record_csv], `file_soundstream_${iteration}.csv`, {type: 'text/csv'});
  decode_files.push(file_letters);
  sound_files.push(file_soundstream);
  console.log("sound start time: " + sound_start_time)
  console.log("sound end time: " + sound_end_time)
  sound_start_time = []
  sound_end_time = []
  output_letters = [];
}

// starts an analysis loop that analyzes db levels from start to finish
function analysis(start, finish) {
  if(analyzing) {
    return;
  }
  
  analyzing = true;
  let amplitudes = [];
  amplitudes.push(SILENCE);
  for(let i = start; i <= finish; i++) {
    amplitudes.push(i);
  }

  if (soundIsPlaying) {
    console.log("cannot play two sounds at once");
    return;
  }

  soundIsPlaying = true;

  osc.start();
  osc.mute = true;
  analysisLoop(amplitudes, 0);
}

// if currently analyzing data uses the following loop to
// change sounds
function analysisLoop(amplitudes, currentAmp) {
  //init oscillator

  initSound();
  soundIsPlaying = true;
  Tone.start().then(() => {
    console.log(amplitudes[currentAmp]);
    if(amplitudes[currentAmp] == SILENCE) {
      osc.mute = true;
    } else {
      osc.volume.value = amplitudes[currentAmp];
    }
      startRecord();

      setTimeout(() => {
        let data = stopRecord(false);
        analyzeRecord(amplitudes[currentAmp], data);

        currentAmp++;

        if (currentAmp < amplitudes.length){
          analysisLoop(amplitudes, currentAmp);
        } else {
          showAnalysis();
          soundIsPlaying = false;
          osc.stop();
          analyzing = false;
        }
      }, ANALYZE_LENGTH * 1000);
  });
}

/* takes in a list of volumes to play and converts it to format to be played

EX: [-20, -20, -20] would play the following sounds
SILENCE: START_END_BUFFER ms, SOUND (-20): OSC_LENGTH, SILENCE: SILENCE_LENGTH,
SOUND (-20): OSC_LENGTH, SILENCE: SILENCE_LENGTH, SOUND (-20): OSC_LENGTH
SILENCE: START_END_BUFFER 
*/
function playMessage(volume_list){
  let i =0;
  let bufferMessage = new Array(volume_list.length * OSC_LENGTH / BASE_LENGTH + (volume_list.length - 1) * SILENCE_LENGTH / BASE_LENGTH + START_END_BUFFER * 2 / BASE_LENGTH)
  let index = 0
  for(index = 0; index < START_END_BUFFER / BASE_LENGTH; index++) {
    bufferMessage[index] = SILENCE
  }

  for(let i = 1; i < volume_list.length * 2; i++) {
    if(i % 2 == 0) {
      for(let j = 0; j < SILENCE_LENGTH / BASE_LENGTH; j++) {
        bufferMessage[index] = SILENCE
        index++
      }
    } else {
        for(let j = 0; j < OSC_LENGTH / BASE_LENGTH; j++) {
          bufferMessage[index] = volume_list[Math.floor(i / 2)];
          index++
        }
    }
  }

  while(index < bufferMessage.length) {
    bufferMessage[index] = SILENCE
    index++
  }

  arrayPlay(bufferMessage)
   
}

//stops the oscillator from making any noise
function stop() {
  soundIsPlaying = false;
  osc.stop();
}

// given a formatted sound message plays the sound
function arrayPlay(bufferMessage) {
  let i = 0;
  if (soundIsPlaying) {
    console.log("cannot play two sounds at once");
    return;
  }
  soundIsPlaying = true;
  Tone.start().then(() => {
      osc.start();
      osc.mute = true;
      let myInterval = setInterval( () => {
        if(i>=bufferMessage.length){
          clearInterval(myInterval);
          this.stop();
        }
        else{
          if(bufferMessage[i] == SILENCE) {
            osc.mute = true;
          }
          else if(bufferMessage[i] != Math.round(osc.volume.value)) {
            osc.volume.value = Math.ceil(bufferMessage[i]);
            timer = new Date()
            sound_start_time.push(timer.getTime())
          }
          
          i++;
        }
        },BASE_LENGTH);
  })
}

// function that returns time it takes arrayPlay to finish playing message
function playTime(message) {
  return START_END_BUFFER * 2 + message.length * OSC_LENGTH + (message.length - 1) * SILENCE_LENGTH;
}

//Function to fix audio not playing bug in Tone.js
"use strict";function unmute(i,e,n){var t;function d(n,i,e,t,d){for(var o=0;o<i.length;++o)n.addEventListener(i[o],e,{capture:t,passive:d})}function o(n,i,e,t,d){for(var o=0;o<i.length;++o)n.removeEventListener(i[o],e,{capture:t,passive:d})}function a(){}void 0===e&&(e=!1),void 0===n&&(n=!1),void 0!==document.hidden?t={hidden:"hidden",visibilitychange:"visibilitychange"}:void 0!==document.webkitHidden?t={hidden:"webkitHidden",visibilitychange:"webkitvisibilitychange"}:void 0!==document.mozHidden?t={hidden:"mozHidden",visibilitychange:"mozvisibilitychange"}:void 0!==document.msHidden&&(t={hidden:"msHidden",visibilitychange:"msvisibilitychange"});var c=navigator.userAgent.toLowerCase(),u=n||0<=c.indexOf("iphone")&&c.indexOf("like iphone")<0||0<=c.indexOf("ipad")&&c.indexOf("like ipad")<0||0<=c.indexOf("ipod")&&c.indexOf("like ipod")<0||0<=c.indexOf("mac os x")&&0<navigator.maxTouchPoints,A=!0;function s(){var n=!(!e&&(t&&document[t.hidden]||u&&!document.hasFocus()));n!==A&&(A=n,b(!1),h())}function l(){s()}function r(n){n&&n.target!==window||s()}function h(){var n;A?"running"!==i.state&&"closed"!==i.state&&k&&(n=i.resume(),n&&n.then(a,a).catch(a)):"running"===i.state&&(n=i.suspend(),n&&n.then(a,a).catch(a))}function v(n){n&&n.unmute_handled||(n.unmute_handled=!0,h())}t&&d(document,[t.visibilitychange],l,!0,!0),u&&d(window,["focus","blur"],r,!0,!0),d(i,["statechange"],v,!0,!0),i.onstatechange||(i.onstatechange=v);var g=null;function m(n,i){for(var e=i;1<n;n--)e+=i;return e}var f="data:audio/mpeg;base64,//uQx"+m(23,"A")+"WGluZwAAAA8AAAACAAACcQCA"+m(16,"gICA")+m(66,"/")+"8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkI"+m(320,"A")+"//sQxAADgnABGiAAQBCqgCRMAAgEAH"+m(15,"/")+"7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq"+m(18,"/")+"9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAw"+m(97,"V")+"Q==";function b(n){var i;u&&(A?n&&(g||(i=document.createElement("div"),i.innerHTML="<audio x-webkit-airplay='deny'></audio>",g=i.children.item(0),g.controls=!1,g.disableRemotePlayback=!0,g.preload="auto",g.src=f,g.loop=!0,g.load()),g.paused&&(i=g.play(),i&&i.then(a,p).catch(p))):p())}function p(){g&&(g.src="about:blank",g.load(),g=null)}var w=["click","contextmenu","auxclick","dblclick","mousedown","mouseup","touchend","keydown","keyup"],k=!1;function y(){k=!0,b(!0),h()}return d(window,w,y,!0,!0),{dispose:function(){p(),t&&o(document,[t.visibilitychange],l,!0,!0),u&&o(window,["focus","blur"],r,!0,!0),o(window,w,y,!0,!0),o(i,["statechange"],v,!0,!0),i.onstatechange===v&&(i.onstatechange=null)}}}