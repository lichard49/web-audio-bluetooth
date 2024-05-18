//
// constants for Serial class
//

const RECORD_LENGTH = 10; // in seconds
const SERIAL_PLOT_LENGTH = 500; // amount of data per frame
const SERIAL_PLOT_UPDATE = 50; // in ms
const ANALYZE_LENGTH = 5; // in seconds
const SNIP_LENGTH = 100; // used to split recorded data into SNIP_LENGTH segments
const AMP_ADJUST = 242; // center of data

//
// constants for test_sound class
//
const OSC_LENGTH = 150
const SILENCE = -100000
const SILENCE_LENGTH = 50
const START_END_BUFFER = 2000
const BASE_LENGTH = 10  //shortest length you can get sound to play is 5 ms
const osc = new Tone.Oscillator(440, "square").toDestination();
const INPUT_TEST_PATH = 'serial_website/input_test.csv'

//
// constants for decode class
//
const detectionSwitch = 10.0;
const detectLength = 20; //check for 20 data points

const ENCODE = {
    "a": -10,
    "b": -9,
    "c": -8,
    "d": -7,
    "e": -6,
    "f": -5,
    "g": -4,
    "h": -3,
    "i": -2,
    "j": -1,
    " ": 0
}

const DECODE = {
    "a": 38,
    "b": 44,
    "c": 49,
    "d": 54,
    "e": 62,
    "f": 69,
    "g": 78,
    "h": 86,
    "i": 98,
    "j": 110,
    " ": 124
}