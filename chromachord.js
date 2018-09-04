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
