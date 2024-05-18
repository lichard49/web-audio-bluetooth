/**
 * Receives input from microcontroller in Web-Audio-Bluetooth project
 * Provides support for a serial plotter, recording data, recording analysis
 * as well as various helper functions
 * If handling input from microcontroller goes here
 */

"use strict";

// controls flow of input audio data
let recording = false;
let plotting = false;
let analyzing = false;
let deciphering = false;
let output_testing = false;

// record global vars
let recordData = [];

// serial plotter global vars
let pauseSerialPlot = false;
let serialPlotData = [];

// analysis global vars
let tableData = [];

// stores actual output from microcontroller
let output_letters = [];

// diff checker strings
let input_text= "";
let output_text = "";


window.addEventListener("load", init);

// Opens web serial connection on load
function init() {
    //initialize some buttons and things
    document.querySelector("#connect").addEventListener('click', async () => {
        const port = await navigator.serial.requestPort();
        try {
            // Wait for the serial port to open.
            document.getElementById("serialConnect").style.visibility = "visible";
            document.getElementById("start").style.visibility = "hidden";
            await port.open({ baudRate: 115200 }); 
        }
        catch {
            console.log("Could not connect to port")
        }

        while (port.readable) {
            const textDecoder = new TextDecoderStream();
            port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable
                .pipeThrough(new TransformStream(new LineBreakTransformer()))
                .getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        // Allow the serial port to be closed later.
                        reader.releaseLock();
                        break;
                    }
                    if (value) {
                        processValue(value);
                    }
                }
            } 
            catch (error) {
                console.log("read error: " + error);
            }
        }
    });

    // initialize input and output for diff
    input_output_support();
}

// value handling function
function processValue(value) {
    let val = parseInt(value);

    // microcontroller is outputting a letter
    if(isNaN(val)) {
        if(!output_testing) {
            console.log("microcontroller output: " + value);
        }
        if(output_testing) {
            // adds value with no special characters
            output_letters.push(value.replace(/[^a-zA-Z0-9 ]/g, ''));
            timer = new Date()
            sound_end_time.push(timer.getTime())
        }
    } 
    
    // microcontroller is outputting sound data
    else {
        if(recording) record(value);
        if(plotting) addToPlot(value);
        if(deciphering) decipher(value);
    }    
}

// starts recording
function startRecord() {
    console.log("starting record");
    recordData = [];
    recording = true;
}

// ends recording
// returns array of data
function stopRecord(visible) {
    console.log("stopping record");
    recording = false;
    if(visible) {
        visualizeRecord(recordData);
    }

    return recordData;
} 

// helper function to see noise in sound signal when no sound is playing
function calcAvgNoise() {
    startRecord();
    setTimeout(() => {
        let arr = stopRecord(false);
        console.log(arr);
        let avg = 0;
        for(let i = 0; i < arr.length; i++) {
            let soundInt = parseInt(arr[i]);
            if(soundInt !== NaN) {
                avg += soundInt;
            }
        }
        console.log(avg / arr.length);
    }, 500);
}

//creates visual graph of recording that we just took
function visualizeRecord(data) {
    console.log(data);
    let TESTER = document.getElementById('tester');
    TESTER.innerHTML = "";
    TESTER.style.visibility = 'visible';
    let x = [];
    for (let i = 0; i < data.length; i++) {
        x.push(i);
    }
	Plotly.newPlot( TESTER, [{
	x: x,
	y: data,
    mode: 'lines',
    type: 'scatter'}],
    {
        title: "Recorded Audio Data" ,
        xaxis: {
            title: 'Audio Sample Number'
        },
        yaxis: {
            title: 'Audio Sample Value'
        }
    });
}

// given recorded data analyzes and provides stats
// adds it to analysisTable
function analyzeRecord(dbLevel, data) {
    console.log("analyzing: " + dbLevel + "db");
    let RMS = 0;
    let snipAvg = 0;
    let snips = [];
    let startRead = 2000;
    //shifted over 2000 to account for lag in serial writing
    //e.g still writing from previous dblevel when recording starts
    for(let i = startRead; i < data.length; i++) {
        if(i % (SNIP_LENGTH) == 0 && i != startRead) {
            snipAvg = snipAvg / SNIP_LENGTH;
            snips.push(snipAvg);
            snipAvg = 0;
        }
        snipAvg += Math.abs(AMP_ADJUST - data[i]);
    }

    let snipLow = Math.min.apply(null, snips);
    let snipHigh = Math.max.apply(null, snips);

    RMS = rmsCalc(data);
    let snr = 0;
    if(tableData.length > 0) snr = RMS / tableData[0].RMSAvg;
    tableData.push(
        {   DBLevel: dbLevel,
            SNR: snr,
            RMSAvg: RMS,
            RMSLow: snipLow,
            RMSHigh: snipHigh,
            SNIPS: snips
        });
}

// shows plot of analysis
// downloads copy of analysis data to computer
function showAnalysis() {
    console.log("showing analysis");
    tableData.shift();
    let dbLevel = tableData.map(a => a.DBLevel);
    let snr = tableData.map(a => a.SNR);
    let snips = tableData.map(a => a.SNIPS);
    document.getElementById("dataAnalysis").style.visibility = "visible";

    let csv = csvMaker(tableData);
    download(csv, 'serialAnalysis.csv');

    let snrAnalysis = document.getElementById("snrAnalysis");
    Plotly.newPlot(snrAnalysis, [{
        x: dbLevel,
        y: snr,
        mode: 'markers',
        type: 'scatter'}], 
        {
            title: "dbLevel v SNR" ,
            xaxis: {
                title: 'DB Level'
            },
            yaxis: {
                title: 'SNR Value'
            }
        });

    let rmsAnalysis = document.getElementById("rmsAnalysis");
    let data = []
    for(let i = 0; i < dbLevel.length; i++) {
        console.log(dbLevel[i] + " db level snips: " + snips[i].length);
        let dbs = Array(snips[i].length).fill(dbLevel[i]);
        let trace = {
            x: dbs,
            y: snips[i],
            mode: 'markers',
            type: 'scatter'
        };

        data.push(trace);
    }

    var layout = {
        showlegend: false,
        title:'Data Labels Hover',
        xaxis: {
            title: 'DB Level'
        },
        yaxis: {
            title: 'RMS Value'
        }
    }

    Plotly.newPlot(rmsAnalysis, data, layout);
      
    tableData = [];
}

// toggles serial
function pauseSerial() {
    pauseSerialPlot = !pauseSerialPlot;
}

// turns on and off serial plotter render
function toggleSerialPlotter() {
    if(plotting) {
        plotting = false;
    } else {
        plotting = true;
        let plotter = document.getElementById('serialPlotter');
        plotter.style.visibility = 'visible';
        let chart = new CanvasJS.Chart("serialPlotter", {
            title :{
                text: "Serial Plotter"
            },
            data: [{
                type: "line",
                dataPoints: serialPlotData
            }]
        });

        let serialUpdate = setInterval(() => {
            if(!pauseSerialPlot) {
                chart.render();
            }
            if(!plotting) {
                serialPlotData = [];
                document.getElementById('serialPlotter').innerHTML = "";
                clearInterval(serialUpdate);
            }
        }, SERIAL_PLOT_UPDATE);
    }
}

// adds data to serial plotter
function addToPlot(value) {
    if(serialPlotData.length != 0) {
        let prev = serialPlotData[serialPlotData.length - 1];
        let xVal = prev.x + 1;
        let yVal = Number(value);
        serialPlotData.push({x: xVal, y: yVal});

        if(serialPlotData.length > SERIAL_PLOT_LENGTH) {
            serialPlotData.shift();
        }
    } else {
        serialPlotData.push({x: 0, y: Number(value)});
    }
}

// stores sound data into an array
function record(value) {
    recordData.push(value);
    if(recordData.length > 10000000) {
        recordData.shift();
    }
}

function input_output_support() {
    readById('inputfile');
    readById('outputfile');
}

function readById(id) {
    document.getElementById(id).addEventListener('change', function () {
        let fr = new FileReader();
        fr.onload = function () {
            let text = fr.result;
            text = text.replace(/,?\r?/gm, "");

            output_text = (id === "outputfile") ? text : output_text;
            input_text = (id === "inputfile") ? text : input_text;
            if(output_text !== "" && input_text !== "") {
                checkDiff(input_text, output_text);
            }
        }
        
        fr.readAsText(this.files[0]);
    });
}

function checkDiff(a, b) {
    const div = document.getElementById("diff");
    const para = document.createElement('p');
    div.appendChild(para);
    const diff = Diff.diffChars(a, b);

    let added = 0;
    let deleted = 0;

    diff.forEach((part) => {
        // green for additions, red for deletions
        // grey for common parts
        const color = part.added ? 'green' :
          part.removed ? 'red' : 'grey';
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(document
          .createTextNode(part.value));
        div.appendChild(span);

        added += part.added ? part.value.replace(/\n/g, "").length : 0;
        deleted += part.removed ? part.value.replace(/\n/g, "").length : 0;
    });

    para.textContent = `added ${added} chars removed ${deleted} chars\n`;
}

// helper function that returns a csv formatted string given
// given an array of data
function csvMaker(data) {  
    // Empty array for storing the values 
    let csvRows = []; 
    // Headers is basically a keys of an 
    // object which is id, name, and 
    // profession 
    let headers = Object.keys(data[0]);
    
    //dont want to include array
    headers.pop();
    // As for making csv format, headers  
    // must be separated by comma and 
    // pushing it into array 
    csvRows.push(headers.join(',')); 
  
    // Pushing Object values into array 
    // with comma separation
    for(let i = 0; i < data.length; i++) {
        let values = Object.values(data[i]);
        values.pop();
        values = values.join(",");
        csvRows.push(values);
    }
  
    // Returning the array joining with new line  
    return csvRows.join('\n') 
}

// helper function that returns an array given a csv formatted string
async function csvConverter(fileLocation) {
    let playLongTest = [];
    for await (const element of CSVIterator(fileLocation)) {
        console.log(element);
        playLongTest.push(element);
      }

    return playLongTest;
}

// processes csv file using js http protocols and returns comma seperated values
async function* CSVIterator(fileURL) {
    console.log(fileURL);
    const utf8Decoder = new TextDecoder("utf-8");
    const response = await fetch(fileURL);
    const reader = response.body.getReader();
    let { value: chunk, done: readerDone } = await reader.read();
    chunk = chunk ? utf8Decoder.decode(chunk) : "";
  
    const newElement = /,\r?\n?/gm;
    let startIndex = 0;
  
    while (true) {
      const result = newElement.exec(chunk);
      if (!result) {
        if (readerDone) break;
        const remainder = chunk.substr(startIndex);
        ({ value: chunk, done: readerDone } = await reader.read());
        chunk = remainder + (chunk ? utf8Decoder.decode(chunk) : "");
        startIndex = newElement.lastIndex = 0;
        continue;
      }
      yield chunk.substring(startIndex, result.index);
      startIndex = newElement.lastIndex;
    }
  
    if (startIndex < chunk.length) {
      // Last line didn't end in a newline char
      yield chunk.substr(startIndex);
    }
}

// given a csv formatted string downloads it to your computer
function download(data, fileName) { 
  
    // Creating a Blob for having a csv file format  
    // and passing the data with type 
    const blob = new Blob([data], { type: 'text/csv' }); 
  
    // Creating an object for downloading url 
    const url = window.URL.createObjectURL(blob) 
  
    // Creating an anchor(a) tag of HTML 
    const a = document.createElement('a') 
  
    // Passing the blob downloading url  
    a.setAttribute('href', url) 
  
    // Setting the anchor tag attribute for downloading 
    // and passing the download file name 
    a.setAttribute('download', fileName); 
  
    // Performing a download with click 
    a.click() 
} 

// helper class to process input serial stream
class LineBreakTransformer {
    constructor() {
      // A container for holding stream data until a new line.
      this.chunks = "";
    }
  
    transform(chunk, controller) {
      // Append new chunks to existing chunks.
      this.chunks += chunk;
      // For each line breaks in chunks, send the parsed lines out.
      const lines = this.chunks.split("\n");
      this.chunks = lines.pop();
      lines.forEach((line) => controller.enqueue(line));
    }
  
    flush(controller) {
      // When the stream is closed, flush any remaining chunks out.
      controller.enqueue(this.chunks);
    }
}
