import { CadenceType, MeasureBlueprint, MotivicRole, ResolvedStyleType, SectionId } from './types';

export interface FormPlan {
  formName: string;
  blueprints: MeasureBlueprint[];
}

function makeBlueprint(
  measureNumber: number,
  sectionId: SectionId,
  phraseIndex: number,
  phrasePos: number,
  motivicRole: MotivicRole,
  cadenceType: CadenceType,
  energy: number,
  isFinal: boolean
): MeasureBlueprint {
  return {
    measureNumber,
    sectionId,
    phraseIndex,
    phrasePos,
    phraseLength: 4,
    motivicRole,
    cadenceType,
    energy,
    isFinal
  };
}

export function planMusicalForm(length: 8 | 16 | 32, style: ResolvedStyleType): FormPlan {
  const blueprints: MeasureBlueprint[] = [];

  if (length === 8) {
    // 8 bars: Parallel Period (a + a') or Musical Sentence (a + a' + cont + cad)
    const useSentence = style !== 'blues' && Math.random() < 0.4;
    const formName =
      style === 'blues'
        ? '8-Bar Blues Form'
        : useSentence
          ? '8-Bar Musical Sentence'
          : 'Parallel Period (a – a′)';

    for (let i = 0; i < 8; i++) {
      const phraseIndex = Math.floor(i / 4);
      const phrasePos = i % 4;
      const isFinal = i === 7;
      const sectionId: SectionId = phraseIndex === 0 ? 'A' : "A'";

      let motivicRole: MotivicRole;
      let cadenceType: CadenceType = 'none';
      let energy: number;

      if (useSentence) {
        // Bars 1-2: statement + sequence; Bars 3-4: continuation; Bars 5-7: drive; Bar 8: cadence
        if (i === 0) motivicRole = 'statement';
        else if (i === 1) motivicRole = 'sequence';
        else if (i === 2) motivicRole = 'statement';
        else if (i === 3) {
          motivicRole = 'cadence';
          cadenceType = 'half';
        } else if (i === 4 || i === 5 || i === 6) motivicRole = 'continuation';
        else {
          motivicRole = 'cadence';
          cadenceType = 'authentic';
        }
        energy = [0.35, 0.45, 0.55, 0.5, 0.65, 0.8, 0.85, 0.4][i];
      } else {
        // Parallel Period: 4-bar Antecedent (HC) + 4-bar Consequent (PAC)
        if (phrasePos === 0) motivicRole = 'statement';
        else if (phrasePos === 1) motivicRole = 'sequence';
        else if (phrasePos === 2) motivicRole = 'continuation';
        else {
          motivicRole = 'cadence';
          cadenceType = phraseIndex === 0 ? 'half' : 'authentic';
        }
        energy = [0.35, 0.45, 0.6, 0.5, 0.45, 0.65, 0.85, 0.4][i];
      }

      blueprints.push(
        makeBlueprint(i + 1, sectionId, phraseIndex, phrasePos, motivicRole, cadenceType, energy, isFinal)
      );
    }

    return { formName, blueprints };
  }

  if (length === 16) {
    // 16 bars: Rounded Binary (A [8] + B [4] + A' [4]) or Double Period (A [8] + A' [8])
    const useRoundedBinary = Math.random() < 0.65;
    const formName =
      style === 'blues'
        ? '16-Bar Blues / Turnaround'
        : useRoundedBinary
          ? 'Rounded Binary (A – B – A′)'
          : 'Double Period (A – A′)';

    for (let i = 0; i < 16; i++) {
      const phraseIndex = Math.floor(i / 4);
      const phrasePos = i % 4;
      const isFinal = i === 15;

      let sectionId: SectionId;
      if (useRoundedBinary) {
        sectionId = phraseIndex < 2 ? 'A' : phraseIndex === 2 ? 'B' : "A'";
      } else {
        sectionId = phraseIndex < 2 ? 'A' : "A'";
      }

      let motivicRole: MotivicRole;
      if (sectionId === 'B') {
        motivicRole = phrasePos === 0 ? 'contrast' : phrasePos === 1 ? 'sequence' : phrasePos === 2 ? 'continuation' : 'cadence';
      } else {
        motivicRole = phrasePos === 0 ? 'statement' : phrasePos === 1 ? 'sequence' : phrasePos === 2 ? 'continuation' : 'cadence';
      }

      let cadenceType: CadenceType = 'none';
      if (phrasePos === 3) {
        if (phraseIndex === 0) cadenceType = 'half';
        else if (phraseIndex === 1) cadenceType = useRoundedBinary ? 'authentic' : 'half';
        else if (phraseIndex === 2) cadenceType = 'half';
        else cadenceType = 'authentic';
      }

      const energyMap = [
        0.35, 0.45, 0.55, 0.45, // Phrase 1 (A)
        0.45, 0.55, 0.7, 0.5, // Phrase 2 (A)
        0.65, 0.75, 0.9, 0.7, // Phrase 3 (B / climax)
        0.55, 0.65, 0.8, 0.4 // Phrase 4 (A' resolution)
      ];

      blueprints.push(
        makeBlueprint(i + 1, sectionId, phraseIndex, phrasePos, motivicRole, cadenceType, energyMap[i], isFinal)
      );
    }

    return { formName, blueprints };
  }

  // 32 bars: Classic AABA Song Form (A [8] + A' [8] + B [8] + A'' [8])
  const formName = 'Song Form (A – A′ – B – A″)';
  const sectionByPhrase: SectionId[] = ['A', 'A', "A'", "A'", 'B', 'B', "A''", "A''"];
  const phraseEnergies = [
    [0.35, 0.42, 0.52, 0.45],
    [0.45, 0.55, 0.68, 0.5],
    [0.45, 0.55, 0.65, 0.52],
    [0.52, 0.62, 0.75, 0.55],
    [0.65, 0.75, 0.85, 0.7],
    [0.72, 0.82, 0.95, 0.75],
    [0.55, 0.65, 0.75, 0.58],
    [0.6, 0.72, 0.85, 0.4]
  ];

  for (let i = 0; i < 32; i++) {
    const phraseIndex = Math.floor(i / 4);
    const phrasePos = i % 4;
    const isFinal = i === 31;
    const sectionId = sectionByPhrase[phraseIndex];

    let motivicRole: MotivicRole;
    if (sectionId === 'B') {
      motivicRole = phrasePos === 0 ? 'contrast' : phrasePos === 1 ? 'sequence' : phrasePos === 2 ? 'continuation' : 'cadence';
    } else {
      motivicRole = phrasePos === 0 ? 'statement' : phrasePos === 1 ? 'sequence' : phrasePos === 2 ? 'continuation' : 'cadence';
    }

    let cadenceType: CadenceType = 'none';
    if (phrasePos === 3) {
      if (phraseIndex === 7) cadenceType = 'authentic';
      else if (phraseIndex === 1 || phraseIndex === 3) cadenceType = 'authentic';
      else cadenceType = 'half';
    }

    blueprints.push(
      makeBlueprint(
        i + 1,
        sectionId,
        phraseIndex,
        phrasePos,
        motivicRole,
        cadenceType,
        phraseEnergies[phraseIndex][phrasePos],
        isFinal
      )
    );
  }

  return { formName, blueprints };
}
