"use strict"

var audioFilenames = [
  "./audio/Kevin_MacLeod_Slow_Burn.mp3",  // http://freemusicarchive.org/music/Kevin_MacLeod/Blues_Sampler/Slow_Burn
  "./audio/Jahzzar_Take_Me_Higher.mp3",   // http://freemusicarchive.org/music/Jahzzar/Tumbling_Dishes_Like_Old-Mans_Wishes/Take_Me_Higher_1626
]
var audioFilename = audioFilenames[Math.floor(Math.random()*audioFilenames.length)];

// --
const Chromagram  = audiopitchr.Chromagram; // input samples per frame, audio sampling rate --> get notes present
const Chromachord = audiopitchr.Chromachord; // input a chromagram --> get most likely chord.
// --
window.dataOut = [];
// --
document.getElementById("startButton").onclick = ()=>{
  document.getElementById("startButton").style.display = "none";
  runTest();
}
// --
function runTest(){
  var frequency   = 440;
  var size        = 2048*4;
  var sampleRate  = 44100;
  // --
  var ctx = document.getElementById("canvas1").getContext("2d");
  var h = 512;
  var w = 1024;
  var xMul = w/size*2;
  // --
  var ctx2 = document.getElementById("canvas2").getContext("2d");
  var h2 = 128;
  var w2 = 1024;
  var xMul2 = w2/12;
  // --
  function plotData(data,style,asLines){
    ctx.beginPath();
    if(asLines){
      ctx.strokeStyle = style;
      ctx.moveTo(0,h-1);
      for(var i=0; i<size; i++){
        var x = i*xMul;
        var y = h*data[i];
        ctx.lineTo(x,h-y);
      }
      ctx.stroke();
    }else{
      ctx.fillStyle = style;
      for(var i=0; i<size; i++){
        var x = i*xMul;
        var y = h*data[i];
        ctx.rect(x,h,xMul,-y);
      }
      ctx.fill();
    }
  }
  function plotChromagram(data){
    ctx2.clearRect(0,0,w2,h2);
    ctx2.beginPath();
    ctx2.fillStyle = "#33CC88";
    for(var i=0; i<12; i++){
      var x = i*xMul2;
      var y = Math.max(0.5, h2*data[i]*20);
      ctx2.rect(x,h2,xMul2,-y);
    }
    ctx2.fill();
  }

  // Create an <audio> element dynamically.
  var audio = new Audio();
  audio.src = audioFilename;
  audio.controls = true;
  audio.autoplay = false;
  audio.loop     = true;
  audio.muted    = false;
  audio.crossorigin = "anonymous";
  document.body.appendChild(audio);
  // --
  var audioCtx = new AudioContext(); // consider OfflineAudioContext?
  var sampleRate = audioCtx.sampleRate;
  console.log("audioCtx.sampleRate: ",sampleRate);
  // --
  var frameHop = 1024*4;
  var approxMillisPerFrame = 1; //frameHop/buffer.sampleRate*1000 * 0.8;
  var chroma = Chromagram(frameHop,sampleRate);
  var frameIndex = 0;
  var xStep = 1;
  // --
  var chordNameEl  = document.getElementById("chordName");
  var chordScoreEl = document.getElementById("chordScore");
  // --
  var currentBestChord  = null;
  var bestChordDBThresh = 12.0;
  var disallowSusChords = true;

  const Y_SCORE = 140;
  const Y_SNR   = 215;
  const Y_ROOT  = 80;
  const Y_NOTES = 15;

  ctx.font="12px Helvetica Neue";
  ctx.fillText("Best Chord Score",2, h-Y_SCORE  +15);
  ctx.fillText("Best Chord SNR",  2, h-Y_SNR    +15);
  ctx.fillText("Chord @ Root",    2, h-Y_ROOT   +15);
  ctx.fillText("Notes",           2, h-Y_NOTES  +15);

  // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
  var scriptNode = audioCtx.createScriptProcessor(frameHop, 1, 1);
  // Give the node a function to process audio events
  var buff = new Float32Array(4096);
  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    frameIndex++;
    // The input buffer is the song we loaded earlier
    var inputBuffer = audioProcessingEvent.inputBuffer;
    // The output buffer contains the samples that will be modified and played
    var outputBuffer = audioProcessingEvent.outputBuffer;
    // Loop through the output channels (in this case there is only one)
    buff.fill(0,0,buff.length);
    var buffDiv = outputBuffer.numberOfChannels;
    for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      var inputData = inputBuffer.getChannelData(channel);
      var outputData = outputBuffer.getChannelData(channel);
      // Loop through the 4096 samples
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
        outputData[sample] = inputData[sample];
        buff[sample] += inputData[sample]/buffDiv;
      }
    }
    // --

    chroma.processAudioFrame(buff);
    if(chroma.isReady()){
      var cgram = chroma.getChromagram();
      plotChromagram(cgram);
      var bestChord = Chromachord.detectChord(cgram,disallowSusChords);
      window.dataOut.push(bestChord);
      //console.log(Chromachord.getTextDesc(bestChord));
      // --
      var cgramSortedLowToHigh = [];
      for(var i=0; i<12; i++) cgramSortedLowToHigh.push(cgram[i]);
      cgramSortedLowToHigh.sort();
      // --
      var cgramMax = Math.max(0.0001, cgramSortedLowToHigh[11]);
      for(var i=0; i<12; i++){
        ctx.fillStyle = "rgba(0,0,0,"+(cgram[i]/cgramMax).toFixed(3)+")";
        ctx.fillRect(frameIndex*xStep,h-Y_NOTES-3*i,xStep,3);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(frameIndex*xStep,h-Y_SCORE-Math.min(100, 100*bestChord.score),xStep,1);
      ctx.fillStyle = "rgba(0,128,128,1)";
      ctx.fillRect(frameIndex*xStep,h-Y_SNR-4*bestChord.snrDB,xStep,3);
      ctx.fillStyle = "rgba(128,128,128,0.5)";
      ctx.fillRect(frameIndex*xStep,h-Y_SNR-4*bestChordDBThresh+1,xStep,1);
      // --
      if(!currentBestChord || bestChord.snrDB > 10.0){
        currentBestChord = bestChord;
      }
      let chordOpacity  = Math.max(0, Math.min(1, (((bestChord.snrDB||0)*4)/100.0) )).toFixed(3);
      let chordColorHSV = Chromachord.getHSVColor(currentBestChord);
      let chordColorFillStyle = "hsl("+chordColorHSV[0]+","+chordColorHSV[1]+"%,"+chordColorHSV[2]+"%)";
      ctx.fillStyle = "rgba(255,128,128,1)";
      ctx.fillRect(frameIndex*xStep,h-Y_NOTES+1-3*bestChord.rootNote,xStep,1);
      ctx.fillStyle = chordColorFillStyle;
      ctx.fillRect(frameIndex*xStep,h-Y_ROOT-4*currentBestChord.rootNote,xStep,4);
      // --
      chordNameEl.innerHTML   = currentBestChord.snrDB>0?Chromachord.getTextDesc(currentBestChord):"--";
      chordScoreEl.innerHTML  = bestChord.snrDB.toFixed(2);
    }
  }
  // --
  var source = audioCtx.createMediaElementSource(audio);
  source.connect(scriptNode);
  scriptNode.connect(audioCtx.destination);
  audio.play();
}
