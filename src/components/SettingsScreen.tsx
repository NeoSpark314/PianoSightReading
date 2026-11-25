import React from 'react';
import {
  DifficultyLevel,
  GenerationConfig,
  KeyCenter,
  LengthOption,
  StyleType
} from '../engine/types';
import { ALL_STYLES, STYLE_REGISTRY } from '../engine/styles';
import { Music, Play, Sparkles, BookOpen, Layers, Gauge } from 'lucide-react';

interface SettingsScreenProps {
  config: GenerationConfig;
  onChangeConfig: (newConfig: GenerationConfig) => void;
  onStartReading: () => void;
}

const DIFFICULTY_OPTIONS: { level: DifficultyLevel; label: string; desc: string }[] = [
  { level: 1, label: 'Level 1', desc: 'Early Int.' },
  { level: 2, label: 'Level 2', desc: 'Intermediate' },
  { level: 3, label: 'Level 3', desc: 'Late Int.' }
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 70%)'
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1rem',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <Music size={16} />
          <span>Interactive Piano Sight-Reading Engine</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem'
        }}>
          Virtuoso Sight-Reader
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto' }}>
          Idiomatic piano repertoire generated on demand to train patterns, voice leading, and musical form.
        </p>
      </header>

      {/* Main Settings Card */}
      <main className="glass-card" style={{
        width: '100%',
        maxWidth: '580px',
        padding: '2.25rem 2rem'
      }}>
        {/* Style Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f1f5f9',
            fontWeight: 600,
            marginBottom: '0.6rem'
          }}>
            <Sparkles size={18} color="#818cf8" />
            <span>Musical Style</span>
          </label>
          <select
            value={config.style}
            onChange={handleStyleChange}
            className="custom-select"
          >
            <option value="random">🎲 Surprise Me (All 7 Styles)</option>
            {ALL_STYLES.map(styleId => (
              <option key={styleId} value={styleId}>
                {STYLE_REGISTRY[styleId].displayName}
              </option>
            ))}
          </select>
          {selectedStyleMeta && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginTop: '0.6rem'
            }}>
              {selectedStyleMeta.pedagogicalTags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.75rem',
                    color: '#c7d2fe',
                    background: 'rgba(99, 102, 241, 0.16)',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f1f5f9',
            fontWeight: 600,
            marginBottom: '0.6rem'
          }}>
            <Gauge size={18} color="#818cf8" />
            <span>Difficulty Level</span>
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem'
          }}>
            {DIFFICULTY_OPTIONS.map(opt => {
              const active = currentDifficulty === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => handleDifficultyChange(opt.level)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.75rem',
                    border: active
                      ? '2px solid #6366f1'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: active
                      ? 'rgba(99, 102, 241, 0.25)'
                      : 'rgba(15, 23, 42, 0.5)',
                    color: active ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.15rem'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Center Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f1f5f9',
            fontWeight: 600,
            marginBottom: '0.6rem'
          }}>
            <BookOpen size={18} color="#818cf8" />
            <span>Key Signature</span>
          </label>
          <select
            value={config.keyCenter}
            onChange={handleKeyChange}
            className="custom-select"
          >
            <option value="random">🎲 Surprise Me (Scaled to Difficulty)</option>
            <optgroup label="0–1 Sharps / Flats">
              <option value="C">C Major (0)</option>
              <option value="Am">A Minor (0)</option>
              <option value="G">G Major (1♯ – F♯)</option>
              <option value="Em">E Minor (1♯ – F♯)</option>
              <option value="F">F Major (1♭ – B♭)</option>
              <option value="Dm">D Minor (1♭ – B♭)</option>
            </optgroup>
            <optgroup label="2 Sharps / Flats">
              <option value="D">D Major (2♯ – F♯, C♯)</option>
              <option value="Bm">B Minor (2♯ – F♯, C♯)</option>
              <option value="Bb">B♭ Major (2♭ – B♭, E♭)</option>
              <option value="Gm">G Minor (2♭ – B♭, E♭)</option>
            </optgroup>
            <optgroup label="3 Sharps / Flats">
              <option value="A">A Major (3♯ – F♯, C♯, G♯)</option>
              <option value="F#m">F♯ Minor (3♯ – F♯, C♯, G♯)</option>
              <option value="Eb">E♭ Major (3♭ – B♭, E♭, A♭)</option>
              <option value="Cm">C Minor (3♭ – B♭, E♭, A♭)</option>
            </optgroup>
          </select>
        </div>

        {/* Length Toggle */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f1f5f9',
            fontWeight: 600,
            marginBottom: '0.6rem'
          }}>
            <Layers size={18} color="#818cf8" />
            <span>Exercise Length</span>
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem'
          }}>
            {(['random', 8, 16, 32] as LengthOption[]).map((len) => (
              <button
                key={String(len)}
                type="button"
                onClick={() => handleLengthChange(len)}
                style={{
                  padding: '0.7rem 0.25rem',
                  borderRadius: '0.75rem',
                  border: config.length === len
                    ? '2px solid #6366f1'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: config.length === len
                    ? 'rgba(99, 102, 241, 0.25)'
                    : 'rgba(15, 23, 42, 0.5)',
                  color: config.length === len ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {len === 'random' ? '🎲 Random' : `${len} Bars`}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onStartReading}
          className="glass-button"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '1.1rem',
            padding: '1.05rem 2rem'
          }}
        >
          <Play size={20} fill="currentColor" />
          <span>Start Reading (Full Screen)</span>
        </button>
      </main>

      {/* Footer Info */}
      <footer style={{ marginTop: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '480px' }}>
        <p>Tip: Tap the right/left edges (or swipe) to turn pieces, and tap the center of the page to show or hide controls.</p>
      </footer>
    </div>
  );
};
