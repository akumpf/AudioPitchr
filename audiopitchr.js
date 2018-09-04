(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

const Chromagram  = require('./src/chromagram_mul.js');
const Chromachord = require('./src/chromachord.js');

module.exports = {
  Chromagram:   Chromagram,
  Chromachord:  Chromachord,
};
// --
global.audiopitchr = module.exports;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./src/chromachord.js":21,"./src/chromagram_mul.js":22}],2:[function(require,module,exports){
/**
 * Real values fourier transform.
 *
 * @module  fourier-transform
 *
 */
'use strict'

module.exports = function rfft (input, spectrum) {
	if (!input) throw Error("Input waveform is not provided, pass input array.")

	var N = input.length

	var k = Math.floor(Math.log(N) / Math.LN2)

	if (Math.pow(2, k) !== N) throw Error("Invalid array size, must be a power of 2.")

	if (!spectrum) spectrum = new Array(N/2)

	//.forward call
	var n         = N,
		x         = new Array(N),
		TWO_PI    = 2*Math.PI,
		sqrt      = Math.sqrt,
		i         = n >>> 1,
		bSi       = 2 / n,
		n2, n4, n8, nn,
		t1, t2, t3, t4,
		i1, i2, i3, i4, i5, i6, i7, i8,
		st1, cc1, ss1, cc3, ss3,
		e,
		a,
		rval, ival, mag

	reverseBinPermute(N, x, input)

	for (var ix = 0, id = 4; ix < n; id *= 4) {
		for (var i0 = ix; i0 < n; i0 += id) {
			//sumdiff(x[i0], x[i0+1]) // {a, b}  <--| {a+b, a-b}
			st1 = x[i0] - x[i0+1]
			x[i0] += x[i0+1]
			x[i0+1] = st1
		}
		ix = 2*(id-1)
	}

	n2 = 2
	nn = n >>> 1

	while((nn = nn >>> 1)) {
		ix = 0
		n2 = n2 << 1
		id = n2 << 1
		n4 = n2 >>> 2
		n8 = n2 >>> 3
		do {
			if(n4 !== 1) {
				for(i0 = ix; i0 < n; i0 += id) {
					i1 = i0
					i2 = i1 + n4
					i3 = i2 + n4
					i4 = i3 + n4

					//diffsum3_r(x[i3], x[i4], t1) // {a, b, s} <--| {a, b-a, a+b}
					t1 = x[i3] + x[i4]
					x[i4] -= x[i3]
					//sumdiff3(x[i1], t1, x[i3])   // {a, b, d} <--| {a+b, b, a-b}
					x[i3] = x[i1] - t1
					x[i1] += t1

					i1 += n8
					i2 += n8
					i3 += n8
					i4 += n8

					//sumdiff(x[i3], x[i4], t1, t2) // {s, d}  <--| {a+b, a-b}
					t1 = x[i3] + x[i4]
					t2 = x[i3] - x[i4]

					t1 = -t1 * Math.SQRT1_2
					t2 *= Math.SQRT1_2

					// sumdiff(t1, x[i2], x[i4], x[i3]) // {s, d}  <--| {a+b, a-b}
					st1 = x[i2]
					x[i4] = t1 + st1
					x[i3] = t1 - st1

					//sumdiff3(x[i1], t2, x[i2]) // {a, b, d} <--| {a+b, b, a-b}
					x[i2] = x[i1] - t2
					x[i1] += t2
				}
			} else {
				for(i0 = ix; i0 < n; i0 += id) {
					i1 = i0
					i2 = i1 + n4
					i3 = i2 + n4
					i4 = i3 + n4

					//diffsum3_r(x[i3], x[i4], t1) // {a, b, s} <--| {a, b-a, a+b}
					t1 = x[i3] + x[i4]
					x[i4] -= x[i3]

					//sumdiff3(x[i1], t1, x[i3])   // {a, b, d} <--| {a+b, b, a-b}
					x[i3] = x[i1] - t1
					x[i1] += t1
				}
			}

			ix = (id << 1) - n2
			id = id << 2
		} while (ix < n)

		e = TWO_PI / n2

		for (var j = 1; j < n8; j++) {
			a = j * e
			ss1 = Math.sin(a)
			cc1 = Math.cos(a)

			//ss3 = sin(3*a) cc3 = cos(3*a)
			cc3 = 4*cc1*(cc1*cc1-0.75)
			ss3 = 4*ss1*(0.75-ss1*ss1)

			ix = 0; id = n2 << 1
			do {
				for (i0 = ix; i0 < n; i0 += id) {
					i1 = i0 + j
					i2 = i1 + n4
					i3 = i2 + n4
					i4 = i3 + n4

					i5 = i0 + n4 - j
					i6 = i5 + n4
					i7 = i6 + n4
					i8 = i7 + n4

					//cmult(c, s, x, y, &u, &v)
					//cmult(cc1, ss1, x[i7], x[i3], t2, t1) // {u,v} <--| {x*c-y*s, x*s+y*c}
					t2 = x[i7]*cc1 - x[i3]*ss1
					t1 = x[i7]*ss1 + x[i3]*cc1

					//cmult(cc3, ss3, x[i8], x[i4], t4, t3)
					t4 = x[i8]*cc3 - x[i4]*ss3
					t3 = x[i8]*ss3 + x[i4]*cc3

					//sumdiff(t2, t4)   // {a, b} <--| {a+b, a-b}
					st1 = t2 - t4
					t2 += t4
					t4 = st1

					//sumdiff(t2, x[i6], x[i8], x[i3]) // {s, d}  <--| {a+b, a-b}
					//st1 = x[i6] x[i8] = t2 + st1 x[i3] = t2 - st1
					x[i8] = t2 + x[i6]
					x[i3] = t2 - x[i6]

					//sumdiff_r(t1, t3) // {a, b} <--| {a+b, b-a}
					st1 = t3 - t1
					t1 += t3
					t3 = st1

					//sumdiff(t3, x[i2], x[i4], x[i7]) // {s, d}  <--| {a+b, a-b}
					//st1 = x[i2] x[i4] = t3 + st1 x[i7] = t3 - st1
					x[i4] = t3 + x[i2]
					x[i7] = t3 - x[i2]

					//sumdiff3(x[i1], t1, x[i6])   // {a, b, d} <--| {a+b, b, a-b}
					x[i6] = x[i1] - t1
					x[i1] += t1

					//diffsum3_r(t4, x[i5], x[i2]) // {a, b, s} <--| {a, b-a, a+b}
					x[i2] = t4 + x[i5]
					x[i5] -= t4
				}

				ix = (id << 1) - n2
				id = id << 2

			} while (ix < n)
		}
	}

	while (--i) {
		rval = x[i]
		ival = x[n-i-1]
		mag = bSi * sqrt(rval * rval + ival * ival)
		spectrum[i] = mag
	}

	spectrum[0] = Math.abs(bSi * x[0])

	return spectrum
}


function reverseBinPermute (N, dest, source) {
	var halfSize    = N >>> 1,
		nm1         = N - 1,
		i = 1, r = 0, h

	dest[0] = source[0]

	do {
		r += halfSize
		dest[i] = source[r]
		dest[r] = source[i]

		i++

		h = halfSize << 1

		while (h = h >> 1, !((r ^= h) & h)) {}

		if (r >= i) {
			dest[i]     = source[r]
			dest[r]     = source[i]

			dest[nm1-i] = source[nm1-r]
			dest[nm1-r] = source[nm1-i]
		}
		i++
	} while (i < halfSize)

	dest[nm1] = source[nm1]
}

},{}],3:[function(require,module,exports){
'use strict'

function bartlettHann (i,N) {
  var inm1 = i/(N-1),
      a0 = 0.62,
      a1 = 0.48,
      a2 = 0.38

  return a0 - a1 * Math.abs(inm1 - 0.5) - a2 * Math.cos(6.283185307179586*inm1)
}

module.exports = bartlettHann

},{}],4:[function(require,module,exports){
'use strict'

function bartlett (i,N) {
  return 1 - Math.abs( 2 * (i - 0.5*(N-1)) / (N-1) )
}

module.exports = bartlett

},{}],5:[function(require,module,exports){
'use strict'

function blackmanHarris (i,N) {
  var a0 = 0.35875,
      a1 = 0.48829,
      a2 = 0.14128,
      a3 = 0.01168,
      f = 6.283185307179586*i/(N-1)

  return a0 - a1*Math.cos(f) +a2*Math.cos(2*f) - a3*Math.cos(3*f)
}

module.exports = blackmanHarris

},{}],6:[function(require,module,exports){
'use strict'

function blackmanNuttall (i,N) {
  var a0 = 0.3635819,
      a1 = 0.4891775,
      a2 = 0.1365995,
      a3 = 0.0106411,
      f = 6.283185307179586*i/(N-1)

  return a0 - a1*Math.cos(f) +a2*Math.cos(2*f) - a3*Math.cos(3*f)
}

module.exports = blackmanNuttall

},{}],7:[function(require,module,exports){
'use strict'

function blackman (i,N) {
  var a0 = 0.42,
      a1 = 0.5,
      a2 = 0.08,
      f = 6.283185307179586*i/(N-1)

  return a0 - a1 * Math.cos(f) + a2*Math.cos(2*f)
}

module.exports = blackman

},{}],8:[function(require,module,exports){
'use strict'

function cosine (i,N) {
  return Math.sin(3.141592653589793*i/(N-1))
}

module.exports = cosine

},{}],9:[function(require,module,exports){
'use strict'

function exactBlackman (i,N) {
  var a0 = 0.42659,
      a1 = 0.49656,
      a2 = 0.076849,
      f = 6.283185307179586*i/(N-1)

  return a0 - a1 * Math.cos(f) + a2*Math.cos(2*f)
}

module.exports = exactBlackman

},{}],10:[function(require,module,exports){
'use strict'

function flatTop (i,N) {
  var a0 = 1,
      a1 = 1.93,
      a2 = 1.29,
      a3 = 0.388,
      a4 = 0.028,
      f = 6.283185307179586*i/(N-1)

  return a0 - a1*Math.cos(f) +a2*Math.cos(2*f) - a3*Math.cos(3*f) + a4 * Math.cos(4*f)
}

module.exports = flatTop

},{}],11:[function(require,module,exports){
'use strict'

function gaussian (i,N,sigma) {
  var nm12 = 0.5*(N-1),
      f = (i-nm12)/sigma/nm12

  return Math.exp(-0.5*f*f)
}

module.exports = gaussian

},{}],12:[function(require,module,exports){
'use strict'

function hamming (i,N) {
  return 0.54 - 0.46 * Math.cos(6.283185307179586*i/(N-1))
}

module.exports = hamming

},{}],13:[function(require,module,exports){
'use strict'

function hann (i,N) {
  return 0.5*(1 - Math.cos(6.283185307179586*i/(N-1)))
}

module.exports = hann

},{}],14:[function(require,module,exports){
'use strict'

module.exports = {
  lanczos: require('./lanczos'),
  rectangular: require('./rectangular'),
  triangular: require('./triangular'),
  bartlett: require('./bartlett'),
  bartlettHann: require('./bartlett-hann'),
  welch: require('./welch'),
  hann: require('./hann'),
  hamming: require('./hamming'),
  blackman: require('./blackman'),
  nuttall: require('./nuttall'),
  blackmanNuttall: require('./blackman-nuttall'),
  blackmanHarris: require('./blackman-harris'),
  exactBlackman: require('./exact-blackman'),
  flatTop: require('./flat-top'),
  cosine: require('./cosine'),
  gaussian: require('./gaussian'),
  tukey: require('./tukey')
}

/*
function applyWindow(signal, func) {
  var i, n=signal.length, args=[0,n]

  for(i=2; i<arguments.length; i++) {
    args[i] = arguments[i]
  }

  for(i=n-1; i>=0; i--) {
    args[0] = i
    signal[i] *= func.apply(null,args)
  }

  return signal;
}


function generate(func, N) {
  var i, args=[0,N]
  var signal = new Array(N);

  for(i=2; i<arguments.length; i++) {
    args[i] = arguments[i]
  }

  for(i=N-1; i>=0; i--) {
    args[0] = i
    signal[i] = func.apply(null,args)
  }
  return signal;
}*/


},{"./bartlett":4,"./bartlett-hann":3,"./blackman":7,"./blackman-harris":5,"./blackman-nuttall":6,"./cosine":8,"./exact-blackman":9,"./flat-top":10,"./gaussian":11,"./hamming":12,"./hann":13,"./lanczos":15,"./nuttall":16,"./rectangular":17,"./triangular":18,"./tukey":19,"./welch":20}],15:[function(require,module,exports){
'use strict'

function sinc (x) {
  return x === 0 ? 1 : 0.3183098861837907 * Math.sin(Math.PI*x) / x
}

function lanczos (i, N) {
  return sinc(2*i/(N-1)-1)
}

module.exports = lanczos

},{}],16:[function(require,module,exports){
'use strict'

var TWOPI = Math.PI * 2

function nuttall (i,N) {
  var a0 = 0.355768,
      a1 = 0.487396,
      a2 = 0.144232,
      a3 = 0.012604,
      f = TWOPI*i/(N-1)

  return a0 - a1*Math.cos(f) +a2*Math.cos(2*f) - a3*Math.cos(3*f)
}

module.exports = nuttall

},{}],17:[function(require,module,exports){
'use strict'

function rectangular (i,N) {
  return 1
}

module.exports = rectangular

},{}],18:[function(require,module,exports){
'use strict'

function triangular (i,N) {
  return 1 - Math.abs( 2 * (i - 0.5*(N-1)) / N )
}

module.exports = triangular

},{}],19:[function(require,module,exports){
'use strict'

function tukey (i,N, alpha) {
  var anm12 = 0.5*alpha*(N-1)

  if( i <= anm12 ) {
    return 0.5*(1+Math.cos(Math.PI*(i/anm12 - 1)))
  } else if ( i < (N-1)*(1-0.5*alpha) ) {
    return 1
  } else {
    return 0.5*(1+Math.cos(Math.PI*(i/anm12 - 2/alpha + 1)))
  }
}

module.exports = tukey

},{}],20:[function(require,module,exports){
'use strict'

function welch (i,N) {
  var nm12 = 0.5*(N-1),
      f = (i - nm12)/nm12
  return 1 - f*f
}

module.exports = welch

},{}],21:[function(require,module,exports){
// Chromachord (chromagram --> chord finder)
// Derived from GNU GPL code: https://github.com/adamstark/Chord-Detector-and-Chromagram/blob/master/src/ChordDetector.cpp
// This implementation by Makefast Workshop, 2018
// --

var ChordQuality = {
  "Unknown":0,
  "Minor":1,
  "Major":2,
  "Suspended":3,
  "Dominant":4,
  "Dimished5th":5,
  "Augmented5th":6
};
var ChordQualityLookup = {};
Object.keys(ChordQuality).forEach(function(key) {
  var val = ChordQuality[key];
  ChordQualityLookup[val] = key;
});
var CHORD_ROOTS = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
module.exports.ChordQuality = ChordQuality;

var bias = 1.06;
var chromagram = new Float32Array(12);
var chordProfiles = new Array(108);
for(var i=0; i<108; i++) chordProfiles[i] = new Array(12);
var chord = new Array(108);
// --
var rootNote    = 0;
var quality     = ChordQuality.Unknown;
var intervals   = 0;
var chordScore  = 0;
//=======================================================================
function detectChord (chromagramToUse, disallowSusChords){
	for (var i = 0; i < 12; i++){
		chromagram[i] = chromagramToUse[i];
	}
	classifyChromagram(disallowSusChords);
  // --
  var cgramSortedLowToHigh = [];
  for(var i=0; i<12; i++) cgramSortedLowToHigh.push(chromagram[i]);
  cgramSortedLowToHigh.sort();
  // --
  var signalAvg = Math.max(0.00001, cgramSortedLowToHigh[11]+cgramSortedLowToHigh[10]+cgramSortedLowToHigh[9]);
  var noiseAvg  = Math.max(0.00001, cgramSortedLowToHigh[0]+cgramSortedLowToHigh[1]+cgramSortedLowToHigh[2]);
  var cgramSNR  = 10.0*Math.log10(Math.max(1.0, Math.min(1000, signalAvg/noiseAvg)));
  return {
    rootNote:   rootNote,
		quality:    quality,
		intervals:  intervals,
    score:      100*chordScore,
    snrDB:      cgramSNR
  };
}
//=======================================================================
function classifyChromagram(disallowSusChords){
	var i;
	var j;
	var fifth;
	var chordindex;

	// remove some of the 5th note energy from chromagram
	for (i = 0; i < 12; i++){
		fifth = (i+7) % 12;
		chromagram[fifth] = chromagram[fifth] - (0.1 * chromagram[i]);
		if (chromagram[fifth] < 0){
			chromagram[fifth] = 0;
		}
	}

	// major chords
	for (j = 0; j < 12; j++)   chord[j] = calculateChordScore(chromagram,chordProfiles[j], bias, 3);
	// minor chords
	for (j = 12; j < 24; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], bias, 3);
	// diminished 5th chords
	for (j = 24; j < 36; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], bias, 3);
	// augmented 5th chords
	for (j = 36; j < 48; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], bias, 3);
  if(!disallowSusChords){
  	// sus2 chords
  	for (j = 48; j < 60; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], 1, 3);
  	// sus4 chords
  	for (j = 60; j < 72; j++)	 chord[j] = calculateChordScore (chromagram, chordProfiles[j], 1, 3);
  }else{
    for (j = 48; j < 60; j++)  chord[j] = 1;
    for (j = 60; j < 72; j++)  chord[j] = 1;
  }
	// major 7th chords
	for (j = 72; j < 84; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], 1, 4);
	// minor 7th chords
	for (j = 84; j < 96; j++)  chord[j] = calculateChordScore (chromagram, chordProfiles[j], bias, 4);
	// dominant 7th chords
	for (j = 96; j < 108; j++) chord[j] = calculateChordScore (chromagram, chordProfiles[j], bias, 4);
  // --
	chordindex = minimumIndex (chord, 108);
  chordScore = chord[chordindex];
  // --
	// major
	if (chordindex < 12){
		rootNote = chordindex;
		quality = ChordQuality.Major;
		intervals = 0;
	}
	// minor
	if ((chordindex >= 12) && (chordindex < 24)){
		rootNote = chordindex-12;
		quality = ChordQuality.Minor;
		intervals = 0;
	}
	// diminished 5th
	if ((chordindex >= 24) && (chordindex < 36)){
		rootNote = chordindex-24;
		quality = ChordQuality.Dimished5th;
		intervals = 0;
	}
	// augmented 5th
	if ((chordindex >= 36) && (chordindex < 48)){
		rootNote = chordindex-36;
		quality = ChordQuality.Augmented5th;
		intervals = 0;
	}
	// sus2
	if ((chordindex >= 48) && (chordindex < 60)){
		rootNote = chordindex-48;
		quality = ChordQuality.Suspended;
		intervals = 2;
	}
	// sus4
	if ((chordindex >= 60) && (chordindex < 72)){
		rootNote = chordindex-60;
		quality = ChordQuality.Suspended;
		intervals = 4;
	}
	// major 7th
	if ((chordindex >= 72) && (chordindex < 84)){
		rootNote = chordindex-72;
		quality = ChordQuality.Major;
		intervals = 7;
	}
	// minor 7th
	if ((chordindex >= 84) && (chordindex < 96)){
		rootNote = chordindex-84;
		quality = ChordQuality.Minor;
		intervals = 7;
	}
	// dominant 7th
	if ((chordindex >= 96) && (chordindex < 108)){
		rootNote = chordindex-96;
		quality = ChordQuality.Dominant;
		intervals = 7;
	}

}
//=======================================================================
function getTextDesc(chordInfo){
  return CHORD_ROOTS[chordInfo.rootNote]+" "+ChordQualityLookup[chordInfo.quality]+" "+(chordInfo.intervals?chordInfo.intervals:"");
}
function getHSVColor(chordInfo){
  let chordQualityName = ChordQualityLookup[chordInfo.quality];
  let hsv = [0,100,50];
  switch(chordQualityName){
    case "Dimished5th": {
      hsv[0] = 320;
      break;
    }
    case "Minor": {
      hsv[0] = 0;
      break;
    }
    case "Suspended": {
      hsv[0] = 90;
      break;
    }
    case "Major": {
      hsv[0] = 180;
      break;
    }
    case "Dominant": {
      hsv[0] = 235;
      break;
    }
    case "Augmented5th": {
      hsv[0] = 280;
      break;
    }
    default:
      hsv[2] = 0;
  }
  if(chordInfo.intervals > 0){
    //chordInfo.intervals = 0,2,4,7
    hsv[1] = 100 - chordInfo.intervals*7;
  }
  return hsv;
}
//=======================================================================
function calculateChordScore (chroma, chordProfile, biasToUse, nn){
	var sum = 0;
	var delta;
	for (var i = 0; i < 12; i++){
		sum += ((1 - chordProfile[i]) * (chroma[i] * chroma[i]));
	}
	delta = Math.sqrt (sum) / ((12 - nn) * biasToUse);
	return delta;
}
//=======================================================================
function minimumIndex (array, arrayLength){
	var minValue = 100000;
	var minIndex = 0;
	for (var i = 0;i < arrayLength;i++){
		if (array[i] < minValue){
			minValue = array[i];
			minIndex = i;
		}
	}
	return minIndex;
}
//=======================================================================
function makeChordProfiles(){
	var i;
	var t;
	var j = 0;
	var root;
	var third;
	var fifth;
	var seventh;
	// --
	var v1 = 1;
	var v2 = 1;
	var v3 = 1;
	// set profiles matrix to all zeros
	for (j = 0; j < 108; j++){
		for (t = 0;t < 12;t++){
			chordProfiles[j][t] = 0;
		}
	}
	// reset j to zero to begin creating profiles
	j = 0;
	// major chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 4) % 12;
		fifth = (i + 7) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// minor chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 3) % 12;
		fifth = (i + 7) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// diminished chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 3) % 12;
		fifth = (i + 6) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// augmented chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 4) % 12;
		fifth = (i + 8) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// sus2 chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 2) % 12;
		fifth = (i + 7) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// sus4 chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 5) % 12;
		fifth = (i + 7) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		j++;
	}
	// major 7th chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 4) % 12;
		fifth = (i + 7) % 12;
		seventh = (i + 11) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		chordProfiles[j][seventh] = v3;
		j++;
	}
	// minor 7th chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 3) % 12;
		fifth = (i + 7) % 12;
		seventh = (i + 10) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		chordProfiles[j][seventh] = v3;
		j++;
	}
	// dominant 7th chords
	for (i = 0; i < 12; i++){
		root = i % 12;
		third = (i + 4) % 12;
		fifth = (i + 7) % 12;
		seventh = (i + 10) % 12;
		chordProfiles[j][root] = v1;
		chordProfiles[j][third] = v2;
		chordProfiles[j][fifth] = v3;
		chordProfiles[j][seventh] = v3;
		j++;
	}
}

// --
makeChordProfiles();

// --
module.exports.detectChord = detectChord;
module.exports.getTextDesc = getTextDesc;
module.exports.getHSVColor = getHSVColor;

},{}],22:[function(require,module,exports){
// Chromagram (audio note finder)
// Derived from GNU GPL code: https://github.com/adamstark/Chord-Detector-and-Chromagram/blob/master/src/Chromagram.cpp
// This implementation by Makefast Workshop, 2018
// --

const FT          = require('fourier-transform');
const windowfuncs = require('window-function');
// --
var FFT_MUL_X     = 1; // x1 = 0.75sec, x2 = 1.5sec, etc.
var REF_FREQ_MUL  = 2;

var exportsAfterInit = {};
// --
var referenceFrequency  = 130.81278265*REF_FREQ_MUL;
var inputAudioFrameSize = 8192; // Note we don't actually have to jump that far each time (i.e. calls/samples can can overlap)
var numHarmonics        = 2;
var numOctaves          = 2;
var numBinsToSearch     = 2;
var fftSize             = 8192*FFT_MUL_X;
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
// --
exportsAfterInit.processAudioFrame  = processAudioFrame;
exportsAfterInit.getChromagram      = getChromagram;
exportsAfterInit.isReady            = isReady;
// --
module.exports = ChromagramInit;

},{"fourier-transform":2,"window-function":14}]},{},[1]);
