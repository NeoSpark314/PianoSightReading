import { MeasureData, StyleType } from './types';

export function applyExpressiveMarkers(
  measures: MeasureData[],
  style: StyleType
): MeasureData[] {
  const totalMeasures = measures.length;

  // Tempo markings based on style
  const tempoTexts: Record<string, string> = {
    alberti: 'Allegretto',
    waltz: 'Tempo di Valse',
    chorale: 'Andante religioso',
    pop: 'Moderato'
  };

  return measures.map((m, idx) => {
    const updated = { ...m };

    // Tempo mark on measure 1
    if (idx === 0) {
      updated.tempoMarker = tempoTexts[style] || 'Moderato';
      updated.dynamicMarker = 'mp';
    }

    // Dynamic climax around 3/4 through the piece
    const climaxBar = Math.floor(totalMeasures * 0.7);
    if (idx === climaxBar - 1) {
      updated.dynamicMarker = 'crescendo';
    } else if (idx === climaxBar) {
      updated.dynamicMarker = 'f';
    } else if (idx === totalMeasures - 1) {
      updated.dynamicMarker = 'p';
    }

    // Apply slur markers to Right Hand notes in 2-bar or 4-bar phrases
    if (updated.trebleNotes && updated.trebleNotes.length > 0) {
      const phrasePos = idx % 4;
      if (phrasePos === 0) {
        // Start slur on first note
        updated.trebleNotes[0] = { ...updated.trebleNotes[0], slurStart: true };
      }
      if (phrasePos === 3 || idx === totalMeasures - 1) {
        // End slur on last note
        const lastIdx = updated.trebleNotes.length - 1;
        updated.trebleNotes[lastIdx] = { ...updated.trebleNotes[lastIdx], slurStop: true };
      }
    }

    return updated;
  });
}
