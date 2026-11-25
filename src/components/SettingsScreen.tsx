import React from 'react';
import {
  DifficultyLevel,
  GenerationConfig,
  KeyCenter,
  LengthOption,
  StyleType
} from '../engine/types';
import { ALL_STYLES, STYLE_REGISTRY } from '../engine/styles';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface SettingsScreenProps {
  config: GenerationConfig;
  onChangeConfig: (newConfig: GenerationConfig) => void;
  onStartReading: () => void;
}

const DIFFICULTY_OPTIONS: { level: DifficultyLevel; label: string; desc: string }[] = [
  { level: 1, label: 'Level I', desc: 'Early Int.' },
  { level: 2, label: 'Level II', desc: 'Intermediate' },
  { level: 3, label: 'Level III', desc: 'Late Int.' }
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  config,
  onChangeConfig,
  onStartReading
}) => {
  const currentDifficulty: DifficultyLevel = config.difficulty || 2;

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ ...config, style: e.target.value as StyleType });
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ ...config, keyCenter: e.target.value as KeyCenter });
  };

  const handleDifficultyChange = (difficulty: DifficultyLevel) => {
    onChangeConfig({ ...config, difficulty });
  };

  const handleLengthChange = (length: LengthOption) => {
    onChangeConfig({ ...config, length });
  };

  const selectedStyleMeta =
    config.style !== 'random' ? STYLE_REGISTRY[config.style] : undefined;

  return (
    <div className="settings-page">
      {/* Masthead */}
      <header className="settings-masthead">
        <div className="settings-kicker">
          <span className="settings-kicker-rule" />
          <span>Piano Sight-Reading Studio</span>
          <span className="settings-kicker-rule" />
        </div>
        <h1 className="settings-title">Prima Vista</h1>
        <p className="settings-subtitle">
          Original repertoire studies generated for daily sight-reading practice.
        </p>
      </header>

      {/* Main Configuration Sheet */}
      <main className="settings-card">
        {/* Musical Style */}
        <div className="field-group">
          <label htmlFor="style-select" className="field-label">
            <span>Style</span>
            {selectedStyleMeta && (
              <span className="field-hint">{selectedStyleMeta.timeSignature.name}</span>
            )}
          </label>
          <div className="select-wrapper">
            <select
              id="style-select"
              value={config.style}
              onChange={handleStyleChange}
              className="editorial-select"
            >
              <option value="random">All Styles (Random)</option>
              {ALL_STYLES.map(styleId => (
                <option key={styleId} value={styleId}>
                  {STYLE_REGISTRY[styleId].displayName}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
          {selectedStyleMeta && (
            <div className="style-tags">
              {selectedStyleMeta.pedagogicalTags.map(tag => (
                <span key={tag} className="style-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Level */}
        <div className="field-group">
          <span className="field-label">
            <span>Difficulty</span>
          </span>
          <div className="segmented-control segmented-control--3" role="group" aria-label="Difficulty level">
            {DIFFICULTY_OPTIONS.map(opt => {
              const active = currentDifficulty === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => handleDifficultyChange(opt.level)}
                  className={`segment-btn ${active ? 'segment-btn--active' : ''}`}
                  aria-pressed={active}
                >
                  <span>{opt.label}</span>
                  <span className="segment-sub">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Signature */}
        <div className="field-group">
          <label htmlFor="key-select" className="field-label">
            <span>Key Signature</span>
          </label>
          <div className="select-wrapper">
            <select
              id="key-select"
              value={config.keyCenter}
              onChange={handleKeyChange}
              className="editorial-select"
            >
              <option value="random">Random (Matched to Difficulty)</option>
              <optgroup label="0–1 Sharps / Flats">
                <option value="C">C Major</option>
                <option value="Am">A Minor</option>
                <option value="G">G Major (1♯)</option>
                <option value="Em">E Minor (1♯)</option>
                <option value="F">F Major (1♭)</option>
                <option value="Dm">D Minor (1♭)</option>
              </optgroup>
              <optgroup label="2 Sharps / Flats">
                <option value="D">D Major (2♯)</option>
                <option value="Bm">B Minor (2♯)</option>
                <option value="Bb">B♭ Major (2♭)</option>
                <option value="Gm">G Minor (2♭)</option>
              </optgroup>
              <optgroup label="3 Sharps / Flats">
                <option value="A">A Major (3♯)</option>
                <option value="F#m">F♯ Minor (3♯)</option>
                <option value="Eb">E♭ Major (3♭)</option>
                <option value="Cm">C Minor (3♭)</option>
              </optgroup>
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>

        {/* Exercise Length */}
        <div className="field-group" style={{ marginBottom: 0 }}>
          <span className="field-label">
            <span>Length</span>
          </span>
          <div className="segmented-control segmented-control--4" role="group" aria-label="Exercise length">
            {(['random', 8, 16, 32] as LengthOption[]).map(len => {
              const active = config.length === len;
              return (
                <button
                  key={String(len)}
                  type="button"
                  onClick={() => handleLengthChange(len)}
                  className={`segment-btn ${active ? 'segment-btn--active' : ''}`}
                  aria-pressed={active}
                >
                  {len === 'random' ? 'Auto' : `${len} Bars`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-divider" />

        {/* Action Button */}
        <button type="button" onClick={onStartReading} className="primary-cta">
          <span>Open Sheet Music</span>
          <ArrowRight size={17} />
        </button>
      </main>

      {/* Footer Note */}
      <footer className="settings-footer">
        <p>Tap the left or right page margins to navigate studies. Tap the center to toggle controls.</p>
      </footer>
    </div>
  );
};
