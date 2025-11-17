// This file uses the Web Audio API to generate sound effects programmatically.

let audioContext: AudioContext | null = null;

/**
 * Initializes the global AudioContext.
 * This must be called as a result of a user interaction (e.g., a button click)
 * to comply with browser autoplay policies.
 */
export const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

/**
 * Plays a short, rising-pitch sound for the player's jump.
 */
export const playJumpSound = () => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;
    
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
    
    oscillator.frequency.setValueAtTime(440, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
};

/**
 * Plays a sharp, cracking sound when the player takes damage.
 */
export const playDamageSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // Create white noise
    const bufferSize = audioContext.sampleRate * 0.15; // 0.15 seconds
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Filter the noise to sound like a 'crack'
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1200, now); // Center frequency for the crack sound
    bandpass.Q.setValueAtTime(8, now); // A high Q value makes it more resonant

    // Create a sharp volume envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005); // Very fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Quick decay

    // Connect the nodes
    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play the sound
    noise.start(now);
    noise.stop(now + 0.15);
};


/**
 * Plays a crunchy impact sound.
 */
const playImpactSoundCrunch = (size?: number) => {
    if (!audioContext) return;
    
    const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Add a random pitch variation to make it less repetitive
    const randomPitch = 0.9 + Math.random() * 0.2; // +/- 10% variation

    // Calculate playback rate based on size
    // Larger size = lower pitch (slower playback)
    if (size !== undefined) {
        const minSize = 15; // Corresponds to MIN_ELEMENT_SIZE
        const maxSize = 40; // Corresponds to MAX_ELEMENT_SIZE
        const minRate = 0.7; // Lower pitch for max size
        const maxRate = 1.5; // Higher pitch for min size
        
        // Clamp the size to the expected range
        const clampedSize = Math.max(minSize, Math.min(maxSize, size));
        
        const sizeRatio = (clampedSize - minSize) / (maxSize - minSize);
        // Invert the ratio so large size maps to low rate
        noise.playbackRate.value = (maxRate - (sizeRatio * (maxRate - minRate))) * randomPitch;
    } else {
        noise.playbackRate.value = 1.0 * randomPitch;
    }

    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    gainNode.gain.setValueAtTime(0, now);
    // Add random variation to the volume for a less repetitive sound
    gainNode.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + 0.1);
};

/**
 * Plays a lower-pitched, crunchy impact sound for more variety.
 */
const playImpactSoundCrunchLower = (size?: number) => {
    if (!audioContext) return;
    
    const bufferSize = audioContext.sampleRate * 0.12; // a bit longer for lower sound
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Add a random pitch variation to make it less repetitive
    const randomPitch = 0.9 + Math.random() * 0.2; // +/- 10% variation

    // Calculate playback rate based on size, shifted to a lower range
    if (size !== undefined) {
        const minSize = 15;
        const maxSize = 40;
        const minRate = 0.5; // Lower pitch for max size (was 0.7)
        const maxRate = 1.2; // Higher pitch for min size (was 1.5)
        
        const clampedSize = Math.max(minSize, Math.min(maxSize, size));
        
        const sizeRatio = (clampedSize - minSize) / (maxSize - minSize);
        // Invert the ratio so large size maps to low rate
        noise.playbackRate.value = (maxRate - (sizeRatio * (maxRate - minRate))) * randomPitch;
    } else {
        noise.playbackRate.value = 0.8 * randomPitch; // was 1.0
    }

    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    gainNode.gain.setValueAtTime(0, now);
    // Add random variation to the volume for a less repetitive sound
    gainNode.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.2, now + 0.01); // Slightly higher gain for a "heavy" feel
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + 0.12);
};


/**
 * Plays a sharp, cracking impact sound.
 */
const playImpactSoundCrack = (size?: number) => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // White noise for the crackle
    const bufferSize = audioContext.sampleRate * 0.1;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // High-pass filter to make it sharp
    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(1800, now);
    highpass.Q.setValueAtTime(12, now);

    // Sharp volume envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    // Pitch variation
    const randomPitch = 0.9 + Math.random() * 0.2; // +/- 10%
    const playbackRate = (1.6 - ((size || 25) / 40)) * randomPitch; // Simple pitch scaling, slightly higher pitch overall
    noise.playbackRate.value = Math.max(0.6, Math.min(2.2, playbackRate));

    noise.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.1);
};

/**
 * Plays a second, slightly different cracking sound for variety.
 */
const playImpactSoundCrackAlternate = (size?: number) => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // White noise for the crackle
    const bufferSize = audioContext.sampleRate * 0.12; // a bit longer
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // High-pass filter to make it sharp
    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(2200, now); // Sharper
    highpass.Q.setValueAtTime(15, now); // More resonant

    // Sharp volume envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    // Pitch variation
    const randomPitch = 0.95 + Math.random() * 0.1; // Tighter pitch range
    // A different playback rate curve
    const playbackRate = (1.9 - ((size || 25) / 40) * 1.2) * randomPitch;
    noise.playbackRate.value = Math.max(0.8, Math.min(2.4, playbackRate));

    noise.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.12);
};

/**
 * Plays a varied, crunchy/crackly impact sound for when an element hits the ground or the player.
 * Randomly selects from several impact sound types for variety.
 */
export const playImpactSound = (size?: number) => {
    if (!audioContext) return;

    const soundFunctions = [playImpactSoundCrunch, playImpactSoundCrunchLower, playImpactSoundCrack, playImpactSoundCrackAlternate];
    const randomIndex = Math.floor(Math.random() * soundFunctions.length);
    soundFunctions[randomIndex](size);
};

/**
 * Plays a pleasant "bloop" sound for collecting water.
 */
export const playWaterCollectSound = () => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, now);
    
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
};

/**
 * Plays a low, rumbling sound for thunder.
 */
export const playThunderSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const bufferSize = audioContext.sampleRate * 2.0; // 2 seconds long
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "lowpass";
    biquadFilter.frequency.setValueAtTime(150, now);
    biquadFilter.Q.setValueAtTime(10, now);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    noise.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 2.0);
};

/**
 * Plays a sharp, layered "zap" and "crackle" sound for a lightning strike.
 */
export const playLightningStrikeSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // Crackle part (high-frequency noise)
    const bufferSize = audioContext.sampleRate * 0.15;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "highpass";
    biquadFilter.frequency.setValueAtTime(1000, now);

    const crackleGain = audioContext.createGain();
    crackleGain.gain.setValueAtTime(0, now);
    crackleGain.gain.linearRampToValueAtTime(0.6, now + 0.005);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(biquadFilter);
    biquadFilter.connect(crackleGain);
    crackleGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.15);

    // Zap part (sharp synth sound)
    const zapOscillator = audioContext.createOscillator();
    zapOscillator.type = 'sawtooth';

    const zapGain = audioContext.createGain();
    zapGain.gain.setValueAtTime(0, now);
    zapGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    zapOscillator.frequency.setValueAtTime(2000, now);
    zapOscillator.frequency.exponentialRampToValueAtTime(50, now + 0.08);

    zapOscillator.connect(zapGain);
    zapGain.connect(audioContext.destination);
    
    zapOscillator.start(now);
    zapOscillator.stop(now + 0.1);
};

/**
 * Plays a sustained, low-frequency rumble for an earthquake.
 */
export const playEarthquakeSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const duration = 30.0; // Corresponds to the event duration

    // Use a looping buffer of white noise
    const bufferSize = audioContext.sampleRate * 1.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter it to create a low rumble
    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "lowpass";
    biquadFilter.frequency.setValueAtTime(80, now); // Very low frequency
    biquadFilter.Q.setValueAtTime(5, now);

    // Control the volume over the duration of the event
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.2); // Fade in
    gainNode.gain.setValueAtTime(0.6, now + duration - 0.5); // Hold volume
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Fade out

    noise.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
};

/**
 * Plays a sustained, howling wind sound for a blizzard.
 */
export const playBlizzardSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const duration = 30.0; // Corresponds to the event duration

    const bufferSize = audioContext.sampleRate * 2.0;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // High-pass filter to create "wind" instead of "rumble"
    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "highpass";
    biquadFilter.frequency.setValueAtTime(600, now);
    biquadFilter.Q.setValueAtTime(10, now);
    
    biquadFilter.frequency.linearRampToValueAtTime(1200, now + duration / 2);
    biquadFilter.frequency.linearRampToValueAtTime(600, now + duration);


    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 1.0); // Slower fade in
    gainNode.gain.setValueAtTime(0.3, now + duration - 1.0);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
};

/**
 * Plays a sustained, gusting wind sound for a storm.
 */
export const playStormSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const duration = 30.0;

    const bufferSize = audioContext.sampleRate * 2.0;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "bandpass";
    biquadFilter.frequency.setValueAtTime(800, now);
    biquadFilter.Q.setValueAtTime(5, now);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.5);
    // Modulate gain to create "gusts"
    gainNode.gain.setTargetAtTime(0.2, now + 2, 1);
    gainNode.gain.setTargetAtTime(0.5, now + 5, 1.5);
    gainNode.gain.setTargetAtTime(0.3, now + 8, 1);
    gainNode.gain.setTargetAtTime(0.6, now + 12, 1);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
};

/**
 * Plays a combined whoosh and explosion sound for a meteor impact.
 */
export const playMeteorImpactSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // Explosion part (low-frequency thump)
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    // Reuse the sharp crackle sound for the impact shatter
    playImpactSoundCrack();
};


/**
 * Plays a sharp "clink" sound for blocking an attack.
 */
export const playBlockSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 2000;

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
};

/**
 * Plays a magical, ascending sound for resurrection.
 */
export const playResurrectSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.7);
    gainNode.connect(audioContext.destination);

    const notes = [60, 64, 67, 72]; // C4, E4, G4, C5 - a C major arpeggio
    const freqFromMidi = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

    notes.forEach((note, index) => {
        const osc = audioContext!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freqFromMidi(note);
        osc.connect(gainNode);
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.2);
    });
};

/**
 * Plays a sharp, cracking sound for when the player's shell breaks.
 */
export const playShellCrackSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const bufferSize = audioContext.sampleRate * 0.1; // short sound
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "highpass";
    biquadFilter.frequency.setValueAtTime(1500, now); // Higher frequency for a 'crack'

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + 0.005); // Very fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1); // Quick decay

    noise.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.1);
};

/**
 * Plays a deep "thump" for the seismic slam ability.
 */
export const playSeismicSlamSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    // The deep "thump"
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // The crackly "impact"
    playImpactSound();
};

/**
 * Plays a soft, shimmering sound for photosynthesis healing.
 */
export const playPhotosynthesisHealSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    gain.connect(audioContext.destination);

    const freqs = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
    freqs.forEach(freq => {
        const osc = audioContext!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.2);
    });
};

/**
 * Plays a satisfying "cha-ching" sound for a golden touch score.
 */
export const playGoldenTouchSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    gain.connect(audioContext.destination);

    const freqs = [1046.50, 2093.00]; // C6, C7
    freqs.forEach((freq, index) => {
        const osc = audioContext!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now + index * 0.05);
        osc.stop(now + 0.4);
    });
};

/**
 * Plays a descending, final sound for game over.
 */
export const playGameOverSound = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);

    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
};