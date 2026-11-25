import { ChordDefinition, NotePitch } from './types';
import { createPitch, getChordTonesInRange } from './pitchUtils';

export interface SATBVoicing {
  bass: NotePitch;
  tenor: NotePitch;
  alto: NotePitch;
  soprano: NotePitch;
}

/**
 * Finds the smoothest close-position piano voicing (2, 3, or 4 notes) for a chord
 * within [minMidi, maxMidi], minimizing total finger movement from prevVoicing.
 */
export function voiceClosePosition(
  chord: ChordDefinition,
  prevVoicing: NotePitch[] | null,
  minMidi: number = 45, // A2
  maxMidi: number = 64, // E4
  noteCount: number = 3
): NotePitch[] {
  // Select core chord tones (for 7th chords with noteCount=3, keep root, 3rd, 7th or 3rd, 5th, 7th)
  let baseTones = chord.pitches;
  if (baseTones.length >= 4 && noteCount === 3) {
    // Classic piano 3-note dominant/7th voicing: omit 5th (keep root, 3rd, 7th)
    baseTones = [baseTones[0], baseTones[1], baseTones[3]];
  } else if (baseTones.length >= 3 && noteCount === 2) {
    // Dyad: keep root + 3rd (or 3rd + 7th for dom7)
    baseTones =
      chord.quality === 'dominant7' && chord.pitches.length >= 4
        ? [chord.pitches[1], chord.pitches[3]]
        : [baseTones[0], baseTones[1]];
  } else {
    baseTones = baseTones.slice(0, noteCount);
  }

  const targetCenter = prevVoicing
    ? prevVoicing.reduce((acc, p) => acc + p.midi, 0) / prevVoicing.length
    : (minMidi + maxMidi) / 2;

  const candidates: NotePitch[][] = [];

  // Build every inversion stacked upwards from each base tone across octaves 2..5
  for (let inv = 0; inv < baseTones.length; inv++) {
    for (let startOct = 2; startOct <= 5; startOct++) {
      const voicing: NotePitch[] = [];
      let prevMidi = -1;
      for (let i = 0; i < baseTones.length; i++) {
        const tone = baseTones[(inv + i) % baseTones.length];
        let oct = startOct;
        let p = createPitch(tone.step, tone.alter || 0, oct);
        while (p.midi <= prevMidi) {
          oct++;
          p = createPitch(tone.step, tone.alter || 0, oct);
        }
        voicing.push(p);
        prevMidi = p.midi;
      }

      const low = voicing[0].midi;
      const high = voicing[voicing.length - 1].midi;
      const span = high - low;
      if (low >= minMidi && high <= maxMidi && span <= 12) {
        candidates.push(voicing);
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: clamp root position into range
    const fallback = baseTones.map((t, idx) => {
      let oct = Math.floor(minMidi / 12) - 1;
      let p = createPitch(t.step, t.alter || 0, oct);
      while (p.midi < minMidi) {
        oct++;
        p = createPitch(t.step, t.alter || 0, oct);
      }
      if (idx > 0 && p.midi <= minMidi) {
        p = createPitch(t.step, t.alter || 0, oct + 1);
      }
      return p;
    });
    return fallback.sort((a, b) => a.midi - b.midi);
  }

  let best = candidates[0];
  let bestScore = Infinity;

  for (const cand of candidates) {
    let score = 0;
    const candCenter = cand.reduce((acc, p) => acc + p.midi, 0) / cand.length;

    if (prevVoicing && prevVoicing.length > 0) {
      // Voice-leading distance between matching sorted voices
      const len = Math.min(cand.length, prevVoicing.length);
      for (let i = 0; i < len; i++) {
        const diff = Math.abs(cand[i].midi - prevVoicing[i].midi);
        score += diff;
        if (diff === 0) score -= 0.75; // Reward common-tone retention
      }
      // Small penalty for drifting too far from register center
      score += Math.abs(candCenter - (minMidi + maxMidi) / 2) * 0.15;
    } else {
      // Opening chord: prefer root position near center
      score = Math.abs(candCenter - targetCenter);
      if (cand[0].step === chord.rootStep) score -= 3;
    }

    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}

/**
 * Picks an idiomatic bass pitch (typically octave 2-3) for LH root or inverted bass lines.
 */
export function chooseBassNote(
  chord: ChordDefinition,
  prevBassMidi: number | null,
  minMidi: number = 38, // D2
  maxMidi: number = 55, // G3
  allowInversion: boolean = false
): NotePitch {
  const rootTones = getChordTonesInRange([chord.pitches[0]], minMidi, maxMidi);
  const thirdTones =
    allowInversion && chord.pitches[1]
      ? getChordTonesInRange([chord.pitches[1]], minMidi, maxMidi)
      : [];

  const pool =
    chord.bassPitch
      ? getChordTonesInRange([chord.bassPitch], minMidi, maxMidi)
      : [...rootTones, ...thirdTones];

  const candidates = pool.length > 0 ? pool : rootTones;
  if (candidates.length === 0) {
    return createPitch(chord.rootStep, chord.rootAlter, 3);
  }

  if (prevBassMidi === null) {
    // Prefer closest to C3 (48)
    return candidates.reduce((best, c) =>
      Math.abs(c.midi - 48) < Math.abs(best.midi - 48) ? c : best
    );
  }

  return candidates.reduce((best, c) => {
    const dBest = Math.abs(best.midi - prevBassMidi);
    const dCurr = Math.abs(c.midi - prevBassMidi);
    // Slight preference for root if distances are close
    const rootBonusCurr = c.step === chord.rootStep ? -1.5 : 0;
    const rootBonusBest = best.step === chord.rootStep ? -1.5 : 0;
    return dCurr + rootBonusCurr < dBest + rootBonusBest ? c : best;
  });
}

/**
 * Generates a playable 4-part piano chorale voicing (LH: Bass+Tenor, RH: Alto+Soprano)
 * with smooth voice leading, no voice crossings, and comfortable hand spans (<= 9 semitones/hand).
 */
export function voiceFourPartChorale(
  chord: ChordDefinition,
  prev: SATBVoicing | null,
  targetSopranoMidi?: number
): SATBVoicing {
  const bass = chooseBassNote(chord, prev ? prev.bass.midi : null, 40, 55, Boolean(prev));

  const tenorCandidates = getChordTonesInRange(chord.pitches, bass.midi + 3, Math.min(62, bass.midi + 10));
  const sopranoMin = 62; // D4
  const sopranoMax = 76; // E5
  const sopranoCandidates = getChordTonesInRange(chord.pitches, sopranoMin, sopranoMax);
  const altoCandidates = getChordTonesInRange(chord.pitches, 55, 69);

  const desiredSop = targetSopranoMidi ?? (prev ? prev.soprano.midi : 69);

  let best: SATBVoicing | null = null;
  let bestCost = Infinity;

  for (const soprano of sopranoCandidates) {
    for (const alto of altoCandidates) {
      if (alto.midi >= soprano.midi - 1) continue; // Keep at least a minor 2nd/3rd spacing
      if (soprano.midi - alto.midi > 9) continue; // Comfortable RH span

      for (const tenor of tenorCandidates) {
        if (tenor.midi >= alto.midi) continue; // No voice crossing
        if (tenor.midi - bass.midi > 10) continue; // Comfortable LH span
        if (alto.midi - tenor.midi > 12) continue; // Avoid huge gap in middle

        // Check chord completeness (prefer having both 3rd and root present)
        const stepsPresent = new Set([bass.step, tenor.step, alto.step, soprano.step]);
        let cost = 0;
        if (!stepsPresent.has(chord.pitches[0].step)) cost += 8;
        if (chord.pitches[1] && !stepsPresent.has(chord.pitches[1].step)) cost += 10;
        if (chord.pitches[2] && !stepsPresent.has(chord.pitches[2].step)) cost += 3;

        // Soprano target pull
        cost += Math.abs(soprano.midi - desiredSop) * 1.1;

        if (prev) {
          cost += Math.abs(soprano.midi - prev.soprano.midi) * 1.0;
          cost += Math.abs(alto.midi - prev.alto.midi) * 1.2;
          cost += Math.abs(tenor.midi - prev.tenor.midi) * 1.2;

          // Avoid parallel 5ths/octaves between outer voices (bass & soprano)
          const prevOuter = (prev.soprano.midi - prev.bass.midi) % 12;
          const currOuter = (soprano.midi - bass.midi) % 12;
          if (
            (currOuter === 0 || currOuter === 7) &&
            currOuter === prevOuter &&
            bass.midi !== prev.bass.midi
          ) {
            cost += 12;
          }
        }

        if (cost < bestCost) {
          bestCost = cost;
          best = { bass, tenor, alto, soprano };
        }
      }
    }
  }

  if (best) return best;

  // Safe fallback if constraints were tight
  const fallbackRh = voiceClosePosition(chord, prev ? [prev.alto, prev.soprano] : null, 60, 74, 2);
  const fallbackTenor = getChordTonesInRange(chord.pitches, bass.midi + 3, Math.min(60, bass.midi + 10))[0] ||
    createPitch(chord.pitches[1]?.step || chord.rootStep, chord.pitches[1]?.alter || 0, bass.octave + 1);
  return {
    bass,
    tenor: fallbackTenor,
    alto: fallbackRh[0],
    soprano: fallbackRh[fallbackRh.length - 1]
  };
}
