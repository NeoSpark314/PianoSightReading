import { MusicPiece, NoteData, NotePitch, TimeSignature } from './types';
import { DIVISIONS_PER_QUARTER, DURATION_SPECS } from './durationUtils';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Compute key-signature default alteration for each diatonic step (C..B)
const SHARP_ORDER: NotePitch['step'][] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: NotePitch['step'][] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function getKeySigStepAlter(step: NotePitch['step'], fifths: number): number {
  if (fifths > 0) {
    return SHARP_ORDER.slice(0, fifths).includes(step) ? 1 : 0;
  }
  if (fifths < 0) {
    return FLAT_ORDER.slice(0, Math.abs(fifths)).includes(step) ? -1 : 0;
  }
  return 0;
}

function alterToAccidentalName(alter: number): string {
  if (alter === 1) return 'sharp';
  if (alter === -1) return 'flat';
  if (alter === 2) return 'double-sharp';
  if (alter === -2) return 'flat-flat';
  return 'natural';
}

function isBeamable(note: NoteData): boolean {
  return (
    !note.isRest &&
    (note.duration === 'eighth' ||
      note.duration === 'sixteenth' ||
      note.duration === 'dotted-eighth')
  );
}

/**
 * Dynamically computes standard musical beam groupings for 4/4, 3/4, 2/4, and 6/8.
 */
function applyAutomaticBeaming(rawNotes: NoteData[], timeSignature: TimeSignature): NoteData[] {
  const notes = rawNotes.map(n => ({ ...n, beam: undefined as NoteData['beam'] }));

  let currentOffset = 0;
  const offsets = notes.map(n => {
    const start = currentOffset;
    const end = start + n.durationInQuarterNotes;
    currentOffset = end;
    return { start, end };
  });

  // Determine primary beam-group size in quarter beats
  // 6/8 -> 1.5 quarter beats (3 eighths per macro-beat)
  // 4/4 -> 2.0 quarter beats (beats 1-2, beats 3-4; never crosses the middle of the bar)
  // 3/4 -> 1.0 quarter beat
  // 2/4 -> 1.0 quarter beat
  let groupSize = 1.0;
  if (timeSignature.name === '6/8') {
    groupSize = 1.5;
  } else if (timeSignature.name === '4/4') {
    groupSize = 2.0;
  }

  const totalQuarterBeats = timeSignature.beats * (4 / timeSignature.beatType);
  const numGroups = Math.round(totalQuarterBeats / groupSize);

  const EPS = 1e-5;

  for (let g = 0; g < numGroups; g++) {
    const gStart = g * groupSize;
    const gEnd = (g + 1) * groupSize;

    // Collect contiguous runs of beamable notes strictly inside [gStart, gEnd]
    let run: number[] = [];
    const flushRun = () => {
      if (run.length >= 2) {
        // Assign level-1 beams across the run
        run.forEach((noteIdx, pos) => {
          const val: 'begin' | 'continue' | 'end' =
            pos === 0 ? 'begin' : pos === run.length - 1 ? 'end' : 'continue';
          notes[noteIdx].beam = [{ number: 1, value: val }];
        });

        // Assign level-2 beams for contiguous sixteenth runs within the group
        let subRun: number[] = [];
        const flushSubRun = () => {
          if (subRun.length >= 2) {
            subRun.forEach((noteIdx, pos) => {
              const val: 'begin' | 'continue' | 'end' =
                pos === 0 ? 'begin' : pos === subRun.length - 1 ? 'end' : 'continue';
              notes[noteIdx].beam = [...(notes[noteIdx].beam || []), { number: 2, value: val }];
            });
          } else if (subRun.length === 1) {
            // Single 16th paired with dotted-eighth gets a hook (backward if at end, forward if at start)
            const idx = subRun[0];
            const posInRun = run.indexOf(idx);
            const hookVal = posInRun > 0 ? 'end' : 'begin';
            // OSMD handles backward/forward hooks cleanly via standard beam when needed,
            // omit single-note beam 2 if ambiguous to keep rendering rock-solid
            if (posInRun > 0 && notes[run[posInRun - 1]].duration === 'dotted-eighth') {
              notes[idx].beam = [...(notes[idx].beam || []), { number: 2, value: hookVal }];
            }
          }
          subRun = [];
        };

        for (const noteIdx of run) {
          if (notes[noteIdx].duration === 'sixteenth') {
            subRun.push(noteIdx);
          } else {
            flushSubRun();
          }
        }
        flushSubRun();
      }
      run = [];
    };

    for (let i = 0; i < notes.length; i++) {
      const off = offsets[i];
      const insideGroup = off.start >= gStart - EPS && off.end <= gEnd + EPS;
      if (insideGroup && isBeamable(notes[i])) {
        run.push(i);
      } else {
        flushRun();
      }
    }
    flushRun();
  }

  return notes;
}

function resolvePitchList(note: NoteData): NotePitch[] {
  if (note.isRest) return [];
  if (note.pitches && note.pitches.length > 0) {
    return [...note.pitches].sort((a, b) => a.midi - b.midi);
  }
  if (note.pitch) return [note.pitch];
  return [];
}

function compileSingleNoteElement(
  pitch: NotePitch | null,
  note: NoteData,
  voice: number,
  staff: number,
  isChordMember: boolean,
  accidentalState: Map<string, number>,
  keyFifths: number
): string {
  const { divisions, xmlType, hasDot } = DURATION_SPECS[note.duration];

  let xml = '      <note>\n';

  if (isChordMember) {
    xml += '        <chord/>\n';
  }

  let accidentalTag: string | null = null;

  if (!pitch) {
    xml += '        <rest/>\n';
  } else {
    const alter = pitch.alter || 0;
    const stateKey = `${pitch.step}${pitch.octave}`;
    const activeAlter = accidentalState.has(stateKey)
      ? accidentalState.get(stateKey)!
      : getKeySigStepAlter(pitch.step, keyFifths);

    if (alter !== activeAlter) {
      accidentalTag = alterToAccidentalName(alter);
      accidentalState.set(stateKey, alter);
    }

    xml += '        <pitch>\n';
    xml += `          <step>${pitch.step}</step>\n`;
    if (alter !== 0) {
      xml += `          <alter>${alter}</alter>\n`;
    }
    xml += `          <octave>${pitch.octave}</octave>\n`;
    xml += '        </pitch>\n';
  }

  xml += `        <duration>${divisions}</duration>\n`;

  // Tie playback markers (on all noteheads of a tied chord/note)
  if (pitch && note.tie) {
    if (note.tie === 'stop' || note.tie === 'continue') {
      xml += '        <tie type="stop"/>\n';
    }
    if (note.tie === 'start' || note.tie === 'continue') {
      xml += '        <tie type="start"/>\n';
    }
  }

  xml += `        <voice>${voice}</voice>\n`;
  xml += `        <type>${xmlType}</type>\n`;
  if (hasDot) {
    xml += '        <dot/>\n';
  }
  if (accidentalTag) {
    xml += `        <accidental>${accidentalTag}</accidental>\n`;
  }
  xml += `        <staff>${staff}</staff>\n`;

  // Beam markers (only on primary notehead of chord)
  if (!isChordMember && note.beam && note.beam.length > 0) {
    note.beam.forEach(b => {
      xml += `        <beam number="${b.number}">${b.value}</beam>\n`;
    });
  }

  // Notations: ties, slurs, articulations
  const hasTieNotation = Boolean(pitch && note.tie);
  const hasSlurNotation = !isChordMember && Boolean(note.slurStart || note.slurStop);
  const hasArticulations =
    !isChordMember && Boolean(note.articulations && note.articulations.length > 0);

  if (hasTieNotation || hasSlurNotation || hasArticulations) {
    xml += '        <notations>\n';
    if (hasTieNotation) {
      if (note.tie === 'stop' || note.tie === 'continue') {
        xml += '          <tied type="stop"/>\n';
      }
      if (note.tie === 'start' || note.tie === 'continue') {
        xml += '          <tied type="start"/>\n';
      }
    }
    if (hasSlurNotation) {
      if (note.slurStart) xml += '          <slur type="start" number="1"/>\n';
      if (note.slurStop) xml += '          <slur type="stop" number="1"/>\n';
    }
    if (hasArticulations && note.articulations) {
      xml += '          <articulations>\n';
      for (const art of note.articulations) {
        xml += `            <${art}/>\n`;
      }
      xml += '          </articulations>\n';
    }
    xml += '        </notations>\n';
  }

  xml += '      </note>\n';
  return xml;
}

function compileNoteDataXml(
  note: NoteData,
  voice: number,
  staff: number,
  accidentalState: Map<string, number>,
  keyFifths: number
): string {
  const pitches = resolvePitchList(note);
  if (pitches.length === 0) {
    return compileSingleNoteElement(null, note, voice, staff, false, accidentalState, keyFifths);
  }

  let xml = '';
  pitches.forEach((p, idx) => {
    xml += compileSingleNoteElement(
      p,
      note,
      voice,
      staff,
      idx > 0,
      accidentalState,
      keyFifths
    );
  });
  return xml;
}

export function compileMusicXml(piece: MusicPiece): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';

  // Work Header
  xml += '  <work>\n';
  xml += `    <work-title>${escapeXml(piece.title)}</work-title>\n`;
  xml += '  </work>\n';
  xml += '  <identification>\n';
  xml += `    <creator type="composer">${escapeXml(piece.composer)}</creator>\n`;
  xml += '  </identification>\n';

  // Part List
  xml += '  <part-list>\n';
  xml += '    <score-part id="P1">\n';
  xml += '      <part-name>Piano</part-name>\n';
  xml += '    </score-part>\n';
  xml += '  </part-list>\n';

  // Part P1
  xml += '  <part id="P1">\n';

  const totalMeasures = piece.measures.length;

  piece.measures.forEach((measure, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === totalMeasures - 1;
    xml += `    <measure number="${measure.measureNumber}">\n`;

    // Measure attributes (First measure setup)
    if (isFirst) {
      xml += '      <attributes>\n';
      xml += `        <divisions>${DIVISIONS_PER_QUARTER}</divisions>\n`;
      xml += '        <key>\n';
      xml += `          <fifths>${piece.keyFifths}</fifths>\n`;
      xml += '        </key>\n';
      xml += '        <time>\n';
      xml += `          <beats>${piece.timeSignature.beats}</beats>\n`;
      xml += `          <beat-type>${piece.timeSignature.beatType}</beat-type>\n`;
      xml += '        </time>\n';
      xml += '        <staves>2</staves>\n';
      xml += '        <clef number="1">\n';
      xml += '          <sign>G</sign>\n';
      xml += '          <line>2</line>\n';
      xml += '        </clef>\n';
      xml += '        <clef number="2">\n';
      xml += '          <sign>F</sign>\n';
      xml += '          <line>4</line>\n';
      xml += '        </clef>\n';
      xml += '      </attributes>\n';
    }

    // Tempo expression text
    if (measure.tempoMarker) {
      xml += '      <direction placement="above">\n';
      xml += '        <direction-type>\n';
      xml += `          <words font-weight="bold">${escapeXml(measure.tempoMarker)}</words>\n`;
      xml += '        </direction-type>\n';
      xml += '        <staff>1</staff>\n';
      xml += '      </direction>\n';
    }

    // Metronome mark on the opening measure
    if (isFirst && piece.tempo) {
      const beatUnit = piece.timeSignature.name === '6/8' ? 'quarter' : 'quarter';
      xml += '      <direction placement="above">\n';
      xml += '        <direction-type>\n';
      xml += '          <metronome parentheses="yes">\n';
      xml += `            <beat-unit>${beatUnit}</beat-unit>\n`;
      if (piece.timeSignature.name === '6/8') {
        xml += '            <beat-unit-dot/>\n';
      }
      xml += `            <per-minute>${piece.tempo}</per-minute>\n`;
      xml += '          </metronome>\n';
      xml += '        </direction-type>\n';
      xml += '        <staff>1</staff>\n';
      xml += `        <sound tempo="${piece.tempo}"/>\n`;
      xml += '      </direction>\n';
    }

    // Close active hairpin wedge before new dynamic
    if (measure.wedgeStop) {
      xml += '      <direction placement="below">\n';
      xml += '        <direction-type>\n';
      xml += '          <wedge type="stop"/>\n';
      xml += '        </direction-type>\n';
      xml += '        <staff>1</staff>\n';
      xml += '      </direction>\n';
    }

    // Dynamic marker direction (placed between grand staves via staff 1 below)
    if (measure.dynamicMarker) {
      if (measure.dynamicMarker === 'crescendo' || measure.dynamicMarker === 'diminuendo') {
        xml += '      <direction placement="below">\n';
        xml += '        <direction-type>\n';
        xml += `          <wedge type="${measure.dynamicMarker}"/>\n`;
        xml += '        </direction-type>\n';
        xml += '        <staff>1</staff>\n';
        xml += '      </direction>\n';
      } else {
        xml += '      <direction placement="below">\n';
        xml += '        <direction-type>\n';
        xml += '          <dynamics>\n';
        xml += `            <${measure.dynamicMarker}/>\n`;
        xml += '          </dynamics>\n';
        xml += '        </direction-type>\n';
        xml += '        <staff>1</staff>\n';
        xml += '      </direction>\n';
      }
    }

    // Track accidentals independently per staff per measure
    const trebleAccidentals = new Map<string, number>();
    const bassAccidentals = new Map<string, number>();

    // Apply automatic metric beaming to Treble Notes
    const beamedTrebleNotes = applyAutomaticBeaming(measure.trebleNotes, piece.timeSignature);

    // Treble Notes (Voice 1, Staff 1)
    let trebleTotalDivisions = 0;
    beamedTrebleNotes.forEach(n => {
      const { divisions } = DURATION_SPECS[n.duration];
      trebleTotalDivisions += divisions;
      xml += compileNoteDataXml(n, 1, 1, trebleAccidentals, piece.keyFifths);
    });

    // Backup to start of measure for Bass Clef
    xml += `      <backup>\n        <duration>${trebleTotalDivisions}</duration>\n      </backup>\n`;

    // Apply automatic metric beaming to Bass Notes
    const beamedBassNotes = applyAutomaticBeaming(measure.bassNotes, piece.timeSignature);

    // Bass Notes (Voice 2, Staff 2)
    beamedBassNotes.forEach(n => {
      xml += compileNoteDataXml(n, 2, 2, bassAccidentals, piece.keyFifths);
    });

    // Final double barline on last measure
    if (isLast) {
      xml += '      <barline location="right">\n';
      xml += '        <bar-style>light-heavy</bar-style>\n';
      xml += '      </barline>\n';
    }

    xml += '    </measure>\n';
  });

  xml += '  </part>\n';
  xml += '</score-partwise>\n';
  return xml;
}
