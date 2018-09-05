"use strict"

var audioFilenames = [
  "./audio/Kevin_MacLeod_Slow_Burn.mp3",      // http://freemusicarchive.org/music/Kevin_MacLeod/Blues_Sampler/Slow_Burn
  "./audio/Jahzzar_Take_Me_Higher.mp3",       // http://freemusicarchive.org/music/Jahzzar/Tumbling_Dishes_Like_Old-Mans_Wishes/Take_Me_Higher_1626
  "./audio/Blind_Blake-Diddie_Wa_Diddie.mp3", // https://publicdomain4u.com/blind-blake-diddie-wa-diddie
]
var audioFilename = audioFilenames[Math.floor(Math.random()*audioFilenames.length)];

// --
const Chromagram  = audiopitchr.Chromagram; // input samples per frame, audio sampling rate --> get notes present
const Chromachord = audiopitchr.Chromachord; // input a chromagram --> get most likely chord.
// --
window.dataOut = [];
// --
document.getElementById("startButtonSong").onclick = ()=>{
  document.getElementById("startButtons").style.display = "none";
  runTest(false);
}
document.getElementById("startButtonMic").onclick = ()=>{
  document.getElementById("startButtons").style.display = "none";
  runTest(true);
}
// --
function runTest(useMic){
  var size        = 2048*4;
  var sampleRate  = 44100;
  // --
  var ctx = document.getElementById("canvas1").getContext("2d");
  var h = 512;
  var w = 1024;
  var xMul = 1;
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


  // --
  var audioCtx = new AudioContext(); // consider OfflineAudioContext?
  var sampleRate = audioCtx.sampleRate;
  console.log("audioCtx.sampleRate: ",sampleRate);
  // --
  var frameSize = 1024*2; // this is how often we process the data. Data is shifted in and processed each time.
  var chroma = Chromagram(frameSize,sampleRate);
  var frameIndex = 5;
  var xStep = 1;
  // --
  var chordNameEl  = document.getElementById("chordName");
  var chordScoreEl = document.getElementById("chordScore");
  // --
  var currentBestChord      = null;
  var bestChordDBThresh     =  8.0;
  var bestChordScoreThresh  = 0.70; // note that lower is better here.
  var disallowSusChords     = false;

  const Y_SNR   = 380;
  const Y_SCORE = 260;
  const Y_ROOT  = 140;
  const Y_NOTES = 20;

  let wipeClean = ()=>{
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(0,0,w,h);
    ctx.font="14px Helvetica Neue";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillText("Best Chord Score",4, h-Y_SCORE  +17);
    ctx.fillText("Best Chord SNR",  4, h-Y_SNR    +17);
    ctx.fillText("Chord @ Root",    4, h-Y_ROOT   +17);
    ctx.fillText("Notes % 12",      4, h-Y_NOTES  +17);
  }
  wipeClean();
  // --

  // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
  var scriptNode = audioCtx.createScriptProcessor(frameSize, 1, 1);
  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    chroma.processAudioFrame(audioProcessingEvent.inputBuffer.getChannelData(0));
    if(chroma.isReady()){
      frameIndex++;
      if(frameIndex >= w){
        wipeClean();
        frameIndex = 5;
      }
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
        ctx.fillRect(frameIndex*xStep,h-Y_NOTES-5*i,xStep,5);
      }
      ctx.fillStyle = "rgba(64,64,64,1)";
      ctx.fillRect(frameIndex*xStep,h-Y_SCORE-Math.min(50, 50*bestChord.score)-1,xStep,3);
      ctx.fillStyle = "rgba(128,128,128,0.5)";
      if(frameIndex%5<3) ctx.fillRect(frameIndex*xStep,h-Y_SCORE-Math.min(50, 50*bestChordScoreThresh),xStep,1);
      ctx.fillStyle = "rgba(64,64,64,1)";
      ctx.fillRect(frameIndex*xStep,h-Y_SNR-2*bestChord.snrDB-1,xStep,3);
      ctx.fillStyle = "rgba(128,128,128,0.5)";
      if(frameIndex%5<3) ctx.fillRect(frameIndex*xStep,h-Y_SNR-2*bestChordDBThresh,xStep,1);
      // --
      if(!currentBestChord || (bestChord.snrDB > bestChordDBThresh && bestChord.score < bestChordScoreThresh)){
        currentBestChord = bestChord;
        ctx.fillStyle = "rgba(0,255,0,0.5)";
      }else{
        ctx.fillStyle = "rgba(128,128,128,0.5)";
      }
      ctx.fillRect(frameIndex*xStep,h-Y_SCORE,xStep,5);
      // --
      let chordOpacity  = Math.max(0, Math.min(1, (((bestChord.snrDB||0)*4)/100.0) )).toFixed(3);
      let chordColorHSV = Chromachord.getHSVColor(currentBestChord);
      let chordColorFillStyle = "hsl("+chordColorHSV[0]+","+chordColorHSV[1]+"%,"+chordColorHSV[2]+"%)";
      ctx.fillStyle = "rgba(255,128,128,1)";
      ctx.fillRect(frameIndex*xStep,h-Y_NOTES-5*bestChord.rootNote+2,xStep,1);
      ctx.fillStyle = chordColorFillStyle;
      ctx.fillRect(frameIndex*xStep,h-Y_ROOT-5*currentBestChord.rootNote-2,xStep,5);
      // --
      chordColorHSV = Chromachord.getHSVColor(bestChord);
      chordColorFillStyle = "hsl("+chordColorHSV[0]+","+chordColorHSV[1]+"%,"+chordColorHSV[2]+"%)";
      ctx.fillStyle = chordColorFillStyle;
      ctx.fillRect(frameIndex*xStep,h-Y_ROOT-5*bestChord.rootNote,xStep,1)
      // --
      chordNameEl.innerHTML   = currentBestChord.snrDB>0?Chromachord.getTextDesc(currentBestChord):"--";
      chordScoreEl.innerHTML  = "SNR: "+bestChord.snrDB.toFixed(2);
    }
  }
  // --
  function gotStream(stream) {
    var source = useMic?audioCtx.createMediaStreamSource(stream):audioCtx.createMediaElementSource(stream);
    // --
    source.connect(scriptNode);
    scriptNode.connect(audioCtx.destination); // need to do this in order for scriptNode to process.
    // --
    if(!useMic){
      var delayNode = audioCtx.createDelay(2*8192/audioCtx.sampleRate);
      delayNode.delayTime.value = 2*8192/audioCtx.sampleRate;
      source.connect(delayNode);
      delayNode.connect(audioCtx.destination);
      stream.play();
    }
  }
  // --
  if(useMic){
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
    navigator.getUserMedia({audio:true}, gotStream, (err)=>{
      console.warn(err);
    });
  }else{
    // Create an <audio> element dynamically.
    var audio = new Audio(audioFilename);
    audio.controls = true;
    audio.autoplay = false;
    audio.loop     = true;
    audio.muted    = false;
    audio.crossorigin = "anonymous";
    document.body.appendChild(audio);
    gotStream(audio);
  }

}
