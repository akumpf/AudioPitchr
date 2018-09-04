# AudioPitchr

** EXPERIMENTAL ** This code is volatile and prone to large changes.

AudioPitchr is a Web Audio based analysis toolset for determining the musical structure of any arbitrary audio source in realtime.


## Usage

AudioPitchr can be installed as an NPM module.

```
npm install AudioPitchr
```

Then, in javascript you can use it like this.


```

const pitchr            = require("AudioPitchr");
const CHROMA_HOP        = 1024*4;
const CHROMA_SAMPLERATE = 44100;  // can be derived from the active AudioContext
const chromagram        = pitchr.Chromagram(CHROMA_HOP,CHROMA_SAMPLERATE);
const chromachord       = pitchr.Chromachord;  

```

## License

AudioPitchr is released as open source under the GNU GPLv3 license.
