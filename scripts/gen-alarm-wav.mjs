/**
 * Generates a "bip-bip bip-bip" alarm WAV file at 1150Hz
 * Output: public/alarm.wav
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/alarm.wav');

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 1;
const BIT_DEPTH = 16;
const FREQ = 1150; // Hz – same as audioAlarm.ts

// Build the bip-bip pattern: beep(85ms) gap(65ms) beep(85ms) gap(220ms) beep(85ms) gap(65ms) beep(85ms)
function makeBeep(durationMs, freq, sampleRate, volume = 0.85) {
  const samples = Math.floor(sampleRate * durationMs / 1000);
  const buf = [];
  const attackSamples = Math.floor(sampleRate * 0.006);
  const releaseSamples = Math.floor(sampleRate * 0.008);
  for (let i = 0; i < samples; i++) {
    let env = volume;
    if (i < attackSamples) env = volume * (i / attackSamples);
    else if (i > samples - releaseSamples) env = volume * ((samples - i) / releaseSamples);
    const sample = env * Math.sin(2 * Math.PI * freq * i / sampleRate);
    buf.push(Math.round(sample * 32767));
  }
  return buf;
}

function makeSilence(durationMs, sampleRate) {
  return new Array(Math.floor(sampleRate * durationMs / 1000)).fill(0);
}

const beep = makeBeep(85, FREQ, SAMPLE_RATE);
const gap1 = makeSilence(65, SAMPLE_RATE);
const gap2 = makeSilence(220, SAMPLE_RATE);

const pcm = [
  ...beep, ...gap1, ...beep, // bip-bip
  ...gap2,
  ...beep, ...gap1, ...beep, // bip-bip
];

// WAV header
const dataLength = pcm.length * (BIT_DEPTH / 8);
const headerSize = 44;
const buf = Buffer.alloc(headerSize + dataLength);

// RIFF chunk
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataLength, 4);
buf.write('WAVE', 8);

// fmt chunk
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);          // chunk size
buf.writeUInt16LE(1, 20);           // PCM
buf.writeUInt16LE(NUM_CHANNELS, 22);
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8), 28); // byte rate
buf.writeUInt16LE(NUM_CHANNELS * (BIT_DEPTH / 8), 32); // block align
buf.writeUInt16LE(BIT_DEPTH, 34);

// data chunk
buf.write('data', 36);
buf.writeUInt32LE(dataLength, 40);
for (let i = 0; i < pcm.length; i++) {
  buf.writeInt16LE(pcm[i], 44 + i * 2);
}

writeFileSync(OUT, buf);
console.log(`✅ alarm.wav gerado: ${OUT} (${(buf.length / 1024).toFixed(1)} KB)`);
