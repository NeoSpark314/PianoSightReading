import React from 'react';
import { GenerationConfig, StyleType, KeyCenter, LengthOption } from '../engine/types';
import { Music, Play, Sparkles, BookOpen, Layers } from 'lucide-react';

interface SettingsScreenProps {
  config: GenerationConfig;
  onChangeConfig: (newConfig: GenerationConfig) => void;
  onStartReading: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  config,
  onChangeConfig,
  onStartReading
}) => {
  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ ...config, style: e.target.value as StyleType });
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({ ...config, keyCenter: e.target.value as KeyCenter });
  };

  const handleLengthChange = (length: LengthOption) => {
    onChangeConfig({ ...config, length });
  };

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
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          Algorithmic intermediate piano exercises generated on demand for tablet & desktop practice.
        </p>
      </header>

      {/* Main Settings Card */}
      <main className="glass-card" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '2.5rem 2rem'
      }}>
        {/* Style Selection */}
        <div style={{ marginBottom: '1.75rem' }}>
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
            <option value="random">🎲 Surprise Me (Random Style)</option>
            <option value="alberti">Classical (Alberti Bass 8ths)</option>
            <option value="waltz">Waltz (3/4 Lyrical Bass & Chords)</option>
            <option value="chorale">Chorale (4/4 Smooth Voice Leading)</option>
            <option value="pop">Pop / Syncopated (Modern Etude)</option>
          </select>
        </div>

        {/* Key Center Selection */}
        <div style={{ marginBottom: '1.75rem' }}>
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
            <option value="random">🎲 Surprise Me (Random Key)</option>
            <option value="C">C Major (No sharps/flats)</option>
            <option value="Am">A Minor (No sharps/flats)</option>
            <option value="G">G Major (1 Sharp - F#)</option>
            <option value="Em">E Minor (1 Sharp - F#)</option>
            <option value="F">F Major (1 Flat - Bb)</option>
            <option value="Dm">D Minor (1 Flat - Bb)</option>
          </select>
        </div>

        {/* Length Toggle */}
        <div style={{ marginBottom: '2.5rem' }}>
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
                  padding: '0.75rem 0.25rem',
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
            padding: '1.1rem 2rem'
          }}
        >
          <Play size={20} fill="currentColor" />
          <span>Start Reading (Full Screen)</span>
        </button>
      </main>

      {/* Footer Info */}
      <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>Tip: On tablet, tap the right half of the screen to generate the next piece, or left half to review.</p>
      </footer>
    </div>
  );
};
