// Web Audio API Sound Generator for Pepsi POS & Distribution ERP
// 100% Offline, Zero Network Latency, Instant Chimes & Haptic Feedback

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
};

/**
 * 🛒 Plays a pleasant, crisp retail POS scanner beep when an item is added to the cart
 */
export const playCartBeep = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6 note)

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (err) {
    console.debug('Audio feedback error:', err);
  }
};

/**
 * 🎉 SIGNATURE UPI & CASH REGISTER SALE SUCCESS CHIME
 * Plays a rich, pleasant 4-note ascending harmonic chime chord (C5 -> E5 -> G5 -> C6)
 * with a sparkling bell chime finish and gentle mobile haptic vibration
 */
export const playSaleSuccessSound = () => {
  try {
    // 📳 Mobile Haptic Vibration pattern (Short Buzz -> Pause -> Strong Confirmatory Buzz)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 110]);
      } catch (e) {
        // Ignore mobile vibration if permissions restricted
      }
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic Chime Notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046.5Hz)
    const notes = [
      { freq: 523.25, time: now + 0.00, dur: 0.22, vol: 0.22, type: 'triangle' },
      { freq: 659.25, time: now + 0.09, dur: 0.24, vol: 0.25, type: 'triangle' },
      { freq: 783.99, time: now + 0.18, dur: 0.30, vol: 0.28, type: 'triangle' },
      { freq: 1046.50, time: now + 0.29, dur: 0.55, vol: 0.35, type: 'sine' },
      // Shimmering High Bell Harmonics on the final resolution
      { freq: 2093.00, time: now + 0.29, dur: 0.45, vol: 0.15, type: 'sine' }
    ];

    notes.forEach(({ freq, time, dur, vol, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      // Smooth attack and natural resonant decay
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + dur);
    });

  } catch (err) {
    console.debug('Sale success audio chime error:', err);
  }
};

export default {
  playCartBeep,
  playSaleSuccessSound
};
