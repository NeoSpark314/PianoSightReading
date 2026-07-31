import { GenerationConfig, MusicPiece, MeasureData, TimeSignature } from './types';
import { KEYS_MAP } from './pitchUtils';
import { generateHarmonicProgression } from './harmonics';
import { generateLeftHandMeasure } from './leftHand';
import { generateRightHandMeasure } from './rightHand';
import { applyExpressiveMarkers } from './expressive';
import { compileMusicXml } from './musicXmlCompiler';

export interface GeneratedResult {
  piece: MusicPiece;
  musicXml: string;
}

export function generateSightReadingPiece(config: GenerationConfig): GeneratedResult {
  // Resolve key center if set to random
  let keyKey = config.keyCenter;
  if (keyKey === 'random') {
    const keys = ['C', 'Am', 'G', 'Em', 'F', 'Dm'];
    keyKey = keys[Math.floor(Math.random() * keys.length)] as any;
  }

  const keyInfo = KEYS_MAP[keyKey] || KEYS_MAP['C'];

  // Time Signature based on style
  const timeSignature: TimeSignature = config.style === 'waltz' 
    ? { beats: 3, beatType: 4, name: '3/4' } 
    : { beats: 4, beatType: 4, name: '4/4' };

  // Phase 1: Harmonic Backbone
  const harmonicProgression = generateHarmonicProgression(keyKey, config.length);

  // Phase 2 & 3: LH & RH note generation measure by measure
  const rawMeasures: MeasureData[] = [];
  let prevTrebleNote = null;

  for (let i = 0; i < harmonicProgression.length; i++) {
    const hMeasure = harmonicProgression[i];
    const isFinal = i === harmonicProgression.length - 1;

    const bassNotes = generateLeftHandMeasure(hMeasure, config.style, isFinal);
    const trebleNotes = generateRightHandMeasure(hMeasure, config.style, keyKey, prevTrebleNote, isFinal);

    if (trebleNotes.length > 0) {
      prevTrebleNote = trebleNotes[trebleNotes.length - 1];
    }

    rawMeasures.push({
      measureNumber: i + 1,
      trebleNotes,
      bassNotes,
      timeSignature: i === 0 ? timeSignature : undefined
    });
  }

  // Phase 4: Expressive Markers
  const expressiveMeasures = applyExpressiveMarkers(rawMeasures, config.style);

  // Title generation
  const styleNames: Record<string, string> = {
    alberti: 'Classical Sonatina Study',
    waltz: 'Lyrical Piano Waltz',
    chorale: 'Sacred Chorale Harmony',
    pop: 'Syncopated Modern Etude'
  };

  const title = config.title || `${styleNames[config.style]} in ${keyInfo.name}`;

  const piece: MusicPiece = {
    title,
    composer: 'Sight-Reading Generator',
    keyName: keyInfo.name,
    keyFifths: keyInfo.fifths,
    isMinor: keyInfo.isMinor,
    timeSignature,
    tempo: config.style === 'chorale' ? 72 : config.style === 'alberti' ? 108 : 120,
    tempoText: config.style === 'chorale' ? 'Andante' : 'Allegretto',
    measures: expressiveMeasures
  };

  // Phase 5: MusicXML Compilation
  const musicXml = compileMusicXml(piece);

  return {
    piece,
    musicXml
  };
}
