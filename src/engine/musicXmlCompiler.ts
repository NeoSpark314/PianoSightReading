import { MusicPiece, NoteData, NoteDuration } from './types';

const DIVISIONS = 4; // 4 divisions per quarter note

function durationToDivisionsAndType(duration: NoteDuration): { divisions: number; typeStr: string; hasDot: boolean } {
  switch (duration) {
    case 'whole':
      return { divisions: 16, typeStr: 'whole', hasDot: false };
    case 'dotted-half':
      return { divisions: 12, typeStr: 'half', hasDot: true };
    case 'half':
      return { divisions: 8, typeStr: 'half', hasDot: false };
    case 'dotted-quarter':
      return { divisions: 6, typeStr: 'quarter', hasDot: true };
    case 'quarter':
      return { divisions: 4, typeStr: 'quarter', hasDot: false };
    case 'eighth':
      return { divisions: 2, typeStr: 'eighth', hasDot: false };
    case 'sixteenth':
      return { divisions: 1, typeStr: 'sixteenth', hasDot: false };
  }
}

function compileNoteXml(note: NoteData, voice: number, staff: number): string {
  const { divisions, typeStr, hasDot } = durationToDivisionsAndType(note.duration);

  let xml = '      <note>\n';

  if (note.isRest || !note.pitch) {
    xml += '        <rest/>\n';
  } else {
    xml += '        <pitch>\n';
    xml += `          <step>${note.pitch.step}</step>\n`;
    if (note.pitch.alter !== undefined && note.pitch.alter !== 0) {
      xml += `          <alter>${note.pitch.alter}</alter>\n`;
    }
    xml += `          <octave>${note.pitch.octave}</octave>\n`;
    xml += '        </pitch>\n';
  }

  xml += `        <duration>${divisions}</duration>\n`;
  xml += `        <voice>${voice}</voice>\n`;
  xml += `        <type>${typeStr}</type>\n`;
  if (hasDot) {
    xml += '        <dot/>\n';
  }
  xml += `        <staff>${staff}</staff>\n`;

  // Notation markers: slurs
  if (note.slurStart || note.slurStop) {
    xml += '        <notations>\n';
    if (note.slurStart) xml += '          <slur type="start" number="1"/>\n';
    if (note.slurStop) xml += '          <slur type="stop" number="1"/>\n';
    xml += '        </notations>\n';
  }

  xml += '      </note>\n';
  return xml;
}

export function compileMusicXml(piece: MusicPiece): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';
  
  // Work Header
  xml += '  <work>\n';
  xml += `    <work-title>${piece.title}</work-title>\n`;
  xml += '  </work>\n';
  xml += '  <identification>\n';
  xml += `    <creator type="composer">${piece.composer}</creator>\n`;
  xml += '  </identification>\n';

  // Part List
  xml += '  <part-list>\n';
  xml += '    <score-part id="P1">\n';
  xml += '      <part-name>Piano</part-name>\n';
  xml += '    </score-part>\n';
  xml += '  </part-list>\n';

  // Part P1
  xml += '  <part id="P1">\n';

  piece.measures.forEach((measure, idx) => {
    const isFirst = idx === 0;
    xml += `    <measure number="${measure.measureNumber}">\n`;

    // Measure attributes (First measure setup)
    if (isFirst) {
      xml += '      <attributes>\n';
      xml += `        <divisions>${DIVISIONS}</divisions>\n`;
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

    // Tempo mark direction
    if (measure.tempoMarker) {
      xml += '      <direction placement="above">\n';
      xml += '        <direction-type>\n';
      xml += `          <words font-weight="bold">${measure.tempoMarker}</words>\n`;
      xml += '        </direction-type>\n';
      xml += '      </direction>\n';
    }

    // Dynamic marker direction
    if (measure.dynamicMarker) {
      if (measure.dynamicMarker === 'crescendo') {
        xml += '      <direction placement="below">\n';
        xml += '        <direction-type>\n';
        xml += '          <wedge type="crescendo"/>\n';
        xml += '        </direction-type>\n';
        xml += '      </direction>\n';
      } else {
        xml += '      <direction placement="below">\n';
        xml += '        <direction-type>\n';
        xml += '          <dynamics>\n';
        xml += `            <${measure.dynamicMarker}/>\n`;
        xml += '          </dynamics>\n';
        xml += '        </direction-type>\n';
        xml += '      </direction>\n';
      }
    }

    // Treble Notes (Voice 1, Staff 1)
    let trebleTotalDivisions = 0;
    measure.trebleNotes.forEach((n) => {
      const { divisions } = durationToDivisionsAndType(n.duration);
      trebleTotalDivisions += divisions;
      xml += compileNoteXml(n, 1, 1);
    });

    // Backup to start of measure for Bass Clef
    xml += `      <backup>\n        <duration>${trebleTotalDivisions}</duration>\n      </backup>\n`;

    // Bass Notes (Voice 2, Staff 2)
    measure.bassNotes.forEach((n) => {
      xml += compileNoteXml(n, 2, 2);
    });

    xml += '    </measure>\n';
  });

  xml += '  </part>\n';
  xml += '</score-partwise>\n';
  return xml;
}
