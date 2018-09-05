// Chromagram (audio note finder)
// Derived from GNU GPL code: https://github.com/adamstark/Chord-Detector-and-Chromagram/blob/master/src/Chromagram.cpp
// This implementation by Makefast Workshop, 2018
// --

const FT          = require('fourier-transform');
const windowfuncs = require('window-function');
// --

var exportsAfterInit = {};
// --
var referenceFrequency  = 130.81278265;
var inputAudioFrameSize = 8192; // Note we don't actually have to jump that far each time (i.e. calls/samples can can overlap)
var numHarmonics        = 2;
var numOctaves          = 2;
var numBinsToSearch     = 2;
var fftSize             = 8192;
var downSampledAudioFrameSize   = inputAudioFrameSize/4;
var downsampledInputAudioFrame  = new Float32Array(downSampledAudioFrameSize);
var filteredFrame               = new Float32Array(inputAudioFrameSize);
// --
var noteFrequencies   = new Float32Array(12);
var chromagram        = new Float32Array(12);
var windowFunction    = new Float32Array(fftSize);
var fftIn             = new Float32Array(fftSize);
var fftInWindowed     = new Float32Array(fftSize);
var magnitudeSpectrum = new Float32Array(fftSize/2);
var fftInSamplesSoFar = 0;
var samplingFrequency = 44100;  // overwritten on init.
// --
for(var i=0; i<fftSize; i++) windowFunction[i] = windowfuncs.blackmanNuttall(i, fftSize);
// --
function ChromagramInit(audioFrameSize, fs){
  inputAudioFrameSize = audioFrameSize;
  samplingFrequency   = fs;
  // --
  downSampledAudioFrameSize  = Math.floor(inputAudioFrameSize / 4);
  downsampledInputAudioFrame = new Float32Array(downSampledAudioFrameSize);
  filteredFrame              = new Float32Array(inputAudioFrameSize);
  // calculate note frequencies
  for (var i = 0; i < 12; i++) noteFrequencies[i] = referenceFrequency * Math.pow(2,i/12.0);
  // initialise chromagram
  for (var i = 0; i < 12; i++) chromagram[i] = 0.0;
  // initialise chroma ready variable
  chromaReady = false;
  // --
  return exportsAfterInit;
}

//==================================================================================
function processAudioFrame(inputAudioFrame){
  // --
  // 1. take in audio and downsample it
  // 2. add it to the end of a 8192 sample buffer (which represents 8192*4 original input samples)
  // 3. window the data, perform FFT (~ 0.75 seconds of audio here...), and put everything into buckets.
  // --
  chromaReady = false;
  // 1.
  downSampleFrameX4(inputAudioFrame);
  // 2.
  shiftInDownsampledAudio();
  if(fftInSamplesSoFar < fftSize){
    //console.log("not enough samples yet...", fftInSamplesSoFar);
    return false;
  }
  // 3.
  calculateChromagram();
  //console.log("Chromagram: ", chromagram);
  return true;
}

//==================================================================================
function getChromagram(){
  return chromagram;
}

//==================================================================================
function isReady(){
  return chromaReady;
}
//==================================================================================
function shiftInDownsampledAudio(){
  // move previous samples back
  for (var i = 0; i < fftSize - downSampledAudioFrameSize; i++){
      fftIn[i] = fftIn[i + downSampledAudioFrameSize];
  }
  // add on new samples to end
  var n = 0;
  for (var i = (fftSize - downSampledAudioFrameSize); i < fftSize; i++){
    fftIn[i] = downsampledInputAudioFrame[n++];
  }
  fftInSamplesSoFar += n;
}
//==================================================================================
function calculateChromagram(){
  // Calculate Magnitude Spectrum
  for (var i = 0; i < fftSize; i++) fftInWindowed[i] = fftIn[i] * windowFunction[i];
  magnitudeSpectrum  = FT(fftInWindowed);
  // --
  var divisorRatio = (samplingFrequency/4.0) / fftSize;
  for (var n = 0; n < 12; n++){
    var chromaSum = 0.0;
    for (var octave = 1; octave <= numOctaves; octave++){
      var noteSum = 0.0;
      for (var harmonic = 1; harmonic <= numHarmonics; harmonic++){
        var centerBin = Math.round ((noteFrequencies[n] * octave * harmonic) / divisorRatio);
        var minBin = centerBin - (numBinsToSearch * harmonic);
        var maxBin = centerBin + (numBinsToSearch * harmonic);
        var maxVal = 0.0;
        for (var k = minBin; k < maxBin; k++){
          if (magnitudeSpectrum[k] > maxVal) maxVal = magnitudeSpectrum[k];
        }
        noteSum += maxVal / harmonic;
      }
      chromaSum += noteSum;
    }
    chromagram[n] = chromaSum;
  }
  chromaReady = true;
}

//==================================================================================
function downSampleFrameX4(inputAudioFrame){
    var b0,b1,b2,a1,a2;
    var x_1,x_2,y_1,y_2;

    b0 = 0.2929;
    b1 = 0.5858;
    b2 = 0.2929;
    a1 = -0.0000;
    a2 = 0.1716;

    x_1 = 0;
    x_2 = 0;
    y_1 = 0;
    y_2 = 0;

    for (var i = 0; i < inputAudioFrameSize; i++){
      filteredFrame[i] = inputAudioFrame[i] * b0 + x_1 * b1 + x_2 * b2 - y_1 * a1 - y_2 * a2;
      x_2 = x_1;
      x_1 = inputAudioFrame[i];
      y_2 = y_1;
      y_1 = filteredFrame[i];
    }

    for (var i = 0; i < downSampledAudioFrameSize; i++){
        downsampledInputAudioFrame[i] = filteredFrame[i * 4];
    }
}
function getProcessingLatencySec(){
  return (4*fftSize/samplingFrequency)/2; // we downsample by a factor of 4 (x4 multiplier), and it takes 1/2 the window before a note is most dominant (div 2).
}
// --
exportsAfterInit.processAudioFrame        = processAudioFrame;
exportsAfterInit.getChromagram            = getChromagram;
exportsAfterInit.isReady                  = isReady;
exportsAfterInit.getProcessingLatencySec  = getProcessingLatencySec;
// --
module.exports = ChromagramInit;
