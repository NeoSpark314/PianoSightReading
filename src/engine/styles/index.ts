import { ResolvedStyleType } from '../types';
import { StyleRealizer } from './types';
import { classicalStyle } from './classical';
import { waltzStyle } from './waltz';
import { baroqueStyle } from './baroque';
import { choraleStyle } from './chorale';
import { popStyle } from './pop';
import { barcarolleStyle } from './barcarolle';
import { bluesJazzStyle } from './bluesJazz';

export const STYLE_REGISTRY: Record<ResolvedStyleType, StyleRealizer> = {
  alberti: classicalStyle,
  waltz: waltzStyle,
  baroque: baroqueStyle,
  chorale: choraleStyle,
  pop: popStyle,
  barcarolle: barcarolleStyle,
  blues: bluesJazzStyle
};

export const ALL_STYLES: ResolvedStyleType[] = [
  'alberti',
  'waltz',
  'baroque',
  'chorale',
  'pop',
  'barcarolle',
  'blues'
];

export function getStyleRealizer(style: ResolvedStyleType): StyleRealizer {
  return STYLE_REGISTRY[style] || classicalStyle;
}

export type { StyleRealizer };
