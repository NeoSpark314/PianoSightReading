import { MeasureBlueprint, MeasureData, NoteData } from './types';
import { StyleRealizer } from './styles/types';

function findFirstSoundingIndex(notes: NoteData[]): number {
  return notes.findIndex(n => !n.isRest);
}

function findLastSoundingIndex(notes: NoteData[]): number {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (!notes[i].isRest) return i;
  }
  return -1;
}

export function applyExpressiveMarkers(
  measures: MeasureData[],
  styleRealizer: StyleRealizer,
  blueprints: MeasureBlueprint[]
): MeasureData[] {
  const totalMeasures = measures.length;

  // Find peak energy measure for climax dynamic
  let climaxIdx = Math.floor(totalMeasures * 0.65);
  let maxEnergy = -1;
  blueprints.forEach((bp, idx) => {
    if (bp.energy > maxEnergy && idx < totalMeasures - 1) {
      maxEnergy = bp.energy;
      climaxIdx = idx;
    }
  });

  const useLyricalPhraseSlurs =
    styleRealizer.id !== 'baroque' && styleRealizer.id !== 'blues';

  // Track whether a phrase slur is currently open so every slurStart has a matching slurStop
  let slurOpen = false;

  return measures.map((m, idx) => {
    const bp = blueprints[idx];
    const trebleNotes = m.trebleNotes.map(n => ({ ...n }));
    const bassNotes = m.bassNotes.map(n => ({ ...n }));
    const updated: MeasureData = { ...m, trebleNotes, bassNotes };

    // Opening tempo & dynamic
    if (idx === 0) {
      updated.tempoMarker = styleRealizer.tempoText;
      updated.dynamicMarker = styleRealizer.id === 'blues' ? 'mf' : 'mp';
    }

    // Form-driven dynamic arc
    if (idx === climaxIdx - 1 && idx > 0) {
      updated.dynamicMarker = 'crescendo';
    } else if (idx === climaxIdx && idx > 0) {
      updated.wedgeStop = true;
      updated.dynamicMarker = styleRealizer.id === 'chorale' ? 'mf' : 'f';
    } else if (idx === totalMeasures - 2 && idx > climaxIdx) {
      updated.dynamicMarker = 'diminuendo';
    } else if (idx === totalMeasures - 1 && idx > climaxIdx) {
      updated.wedgeStop = idx === totalMeasures - 1 && totalMeasures - 2 > climaxIdx;
      updated.dynamicMarker = styleRealizer.id === 'blues' ? 'mf' : 'mp';
    }

    // Rest-aware phrase slurs for lyrical/classical/waltz/pop/chorale styles
    if (useLyricalPhraseSlurs && trebleNotes.length > 0) {
      const firstSound = findFirstSoundingIndex(trebleNotes);
      const lastSound = findLastSoundingIndex(trebleNotes);

      if (bp.phrasePos === 0 && !slurOpen && firstSound !== -1) {
        trebleNotes[firstSound] = { ...trebleNotes[firstSound], slurStart: true };
        slurOpen = true;
      }

      if ((bp.phrasePos === 3 || bp.isFinal) && slurOpen && lastSound !== -1) {
        // Avoid degenerate slur starting and ending on the exact same single note
        if (!(trebleNotes[lastSound].slurStart && lastSound === firstSound)) {
          trebleNotes[lastSound] = { ...trebleNotes[lastSound], slurStop: true };
        } else {
          trebleNotes[lastSound] = { ...trebleNotes[lastSound], slurStart: false };
        }
        slurOpen = false;
      }
    }

    return updated;
  });
}
