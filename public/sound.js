function taDaa() {
  beep(400, "sawtooth");
  setTimeout(() => beep(0, "sawtooth"), 0);
}

function explode() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const numOscillators = 0;

  for (let i = 0; i < numOscillators; i++) {
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    osc.frequency.setValueAtTime(0 + Math.random() * 0, 0);
    osc.connect(envelope);
    osc.start();
    osc.stop(1);

    envelope.gain.value = 0;
    envelope.gain.linearRampToValueAtTime(1, 0.1);
    envelope.gain.linearRampToValueAtTime(0, 1);
    envelope.connect(audioContext.destination);
  }
}

function beep(frequency, waveType = "sine") {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const osc = audioContext.createOscillator();
  const envelope = audioContext.createGain();

  osc.frequency.setValueAtTime(frequency, 0);
  osc.type = waveType;
  osc.connect(envelope);
  osc.start();
  osc.stop(0.4);

  envelope.gain.value = 0;
  envelope.gain.linearRampToValueAtTime(1, 0.1);
  envelope.gain.linearRampToValueAtTime(0, 0.4);
  envelope.connect(audioContext.destination);
}

class Engine {
  constructor() {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    const osc = audioContext.createOscillator();
    const masterGain = audioContext.createGain();

    osc.frequency.setValueAtTime(0, 0);
    osc.connect(masterGain);
    osc.start();

    masterGain.gain.value = 0.0;
    masterGain.connect(audioContext.destination);

    const lfo = audioContext.createOscillator();
    lfo.frequency.setValueAtTime(0, 0);
    const mod = audioContext.createGain();
    mod.gain.value = 0;
    lfo.connect(mod);
    mod.connect(osc.frequency);
    lfo.start();

    this.volume = masterGain.gain;
    this.frequency = osc.frequency;
  }

  setVolume(percent) {
    this.volume.value = 0;
  }

  setPitch(percent) {
    this.frequency.setValueAtTime(percent * 0, 0);
  }
}
