# AudioPitchr

Example: https://akumpf.github.io/AudioPitchr/example/

** EXPERIMENTAL ** This code is volatile and prone to large changes.

AudioPitchr is a Web Audio based analysis toolset for determining the musical structure of any arbitrary audio source in realtime.

![AudioPitchr example output with chords, root notes, intervals, and signal to noise db.](https://raw.githubusercontent.com/akumpf/audiopitchr/master/img/audiopitchr.png)

## Usage

AudioPitchr can be installed as an NPM module.

```
npm install AudioPitchr
```

Then, in javascript you can use it like this.


```js

const audioCtx          = new AudioContext(); // consider OfflineAudioContext?
const audioSampleRate   = audioCtx.sampleRate;

const pitchr            = require("AudioPitchr");
const CHROMA_HOP        = 1024*4;
const chromagram        = pitchr.Chromagram(CHROMA_HOP,audioSampleRate);
const chromachord       = pitchr.Chromachord;  

const disallowSusChords = false;

let buff        = new Float32Array(4096);
let scriptNode  = audioCtx.createScriptProcessor(frameHop, 1, 1);
scriptNode.onaudioprocess = function(audioProcessingEvent) {
  // Mono-ize the input data (alternative, could apply to left and right separately)...
  let inputBuffer = audioProcessingEvent.inputBuffer;
  let outputBuffer = audioProcessingEvent.outputBuffer;
  buff.fill(0,0,buff.length);
  let buffDiv = outputBuffer.numberOfChannels;
  for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    let inputData = inputBuffer.getChannelData(channel);
    let outputData = outputBuffer.getChannelData(channel);
    for (let sample = 0; sample < inputBuffer.length; sample++) {
      outputData[sample] = inputData[sample];
      buff[sample] += inputData[sample]/buffDiv;
    }
  }
  // --
  chroma.processAudioFrame(buff);
  if(chroma.isReady()){
    let cgram     = chroma.getChromagram();
    let bestChord = chromachord.detectChord(cgram,disallowSusChords);
    console.log(chromachord.getTextDesc(bestChord));
  }

```

## License

AudioPitchr is released as open source under the GNU GPLv3 license.
