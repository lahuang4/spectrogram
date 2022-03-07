// Handle audio file upload.
function handleFiles(event) {
  var files = event.target.files;
  document.getElementById('src').src = URL.createObjectURL(files[0]);
  document.getElementById('music').load();

  processAudio();
}

document.getElementById('upload').addEventListener('change', handleFiles, false);

var audioContext, sourceNode, analyser, theBuffer, mediaStreamSource, detectorElem, canvasElem, pitchElem, noteElem, detuneElem, detuneAmount;
var buflen = 4096;
var buf = new Float32Array(buflen);

function processAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioElement = document.querySelector('#music');
  sourceNode = audioContext.createMediaElementSource(audioElement);
  sourceNode.connect(audioContext.destination);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = buflen;
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
}

let canvas;

function draw() {
  if (!analyser) {
    return;
  }
  analyser.getFloatFrequencyData(buf);
  // Zero out everything outside of the typical music range: 20 Hz to 5 kHz. https://www.psbspeakers.com/the-frequencies-of-music/
  let minThreshold = 20;
  let maxThreshold = 5000;
  // Boost everything within 2 octaves of middle C: 65 Hz to 1046 Hz. https://en.wikipedia.org/wiki/Piano_key_frequencies
  let minBoostThreshold = 65;
  let maxBoostThreshold = 1046;
  // The frequency data ranges from frequencies 0 to 1/2 of the sample rate (the last element in buf is the amplitude at 1/2 the sample rate).
  let bucketSize = (audioContext.sampleRate / 2) / (buflen - 1);
  for (let i = 0; i < buflen; i++) {
    let freqMin = i * bucketSize;
    let freqMax = freqMin + bucketSize;
    if (freqMax < minThreshold || freqMin > maxThreshold) {
      buf[i] = 0;
    }
    if (buf[i] === 0) {
      continue;
    }
    if (freqMin > minBoostThreshold && freqMax < maxBoostThreshold) {
      buf[i] += 100;
    }
  }

  if (!canvas) {
    // Each bucket actually takes up 2 pixels (1 pixel for the bar, 1 pixel for the space next to it).
    // So to draw enough buckets to cover up to the max threshold, we need double the number of pixels.
    canvas = createCanvas(maxThreshold / bucketSize * 2, 256);
  }

  // Find max frequency.
  let iMax = 0;
  let bufMax = -Infinity;
  for (let i = 0; i < buflen; i++) {
    if (buf[i] !== 0 && buf[i] > bufMax) {
      iMax = i;
      bufMax = buf[i];
    }
  }

  // Display the max frequency, if one was found.
  if (bufMax !== -Infinity) {
    let freqMin = iMax * bucketSize;
    let freqMax = freqMin + bucketSize;
    // Round numbers before displaying them.
    document.getElementById('max_freq').innerHTML = round(freqMin) + ' Hz - ' + round(freqMax) + ' Hz';
  }

  // Draw the spectrogram.
  background(220);
  noStroke();
  fill(255, 0, 255);

  let barWidth = 1;
  let barHeight;
  let x = 0;

  for (let i = 0; i < buflen; i++) {
    if (buf[i] === 0) {
      // Ignore 0s.
      x += barWidth+1;
      continue;
    }
    // Boost up the bars because otherwise they're negative.
    barHeight = (buf[i] + 140) * 2;
    rect(x, height-barHeight/2, barWidth, barHeight/2);
    x += barWidth+1;
  }

  // Draw some lines to indicate where frequencies of note (haha, get it?) are.
  fill(0, 0, 255);
  stroke(100);
  x = 65 / bucketSize * 2;
  let y = 12;
  line(x, 0, x, height);
  text('65 Hz (Deep C)', x, y);
  x = 196 / bucketSize * 2;
  y += 12;
  line(x, 0, x, height);
  text('196 Hz (G)', x, y);
  x = 294 / bucketSize * 2;
  y += 12;
  line(x, 0, x, height);
  text('294 Hz (D)', x, y);
  x = 440 / bucketSize * 2;
  y += 12;
  line(x, 0, x, height);
  text('440 Hz (A)', x, y);
  x = 660 / bucketSize * 2;
  y += 12;
  line(x, 0, x, height);
  text('660 Hz (E)', x, y);
  x = 1046 / bucketSize * 2;
  y += 12;
  line(x, 0, x, height);
  text('1046 Hz (High C)', x, y);
}