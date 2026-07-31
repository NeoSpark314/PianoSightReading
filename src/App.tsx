import React, { useState } from 'react';
import { GenerationConfig } from './engine/types';
import { generateSightReadingPiece, GeneratedResult } from './engine/generator';
import { SettingsScreen } from './components/SettingsScreen';
import { ReadingView } from './components/ReadingView';

const STORAGE_KEY = 'piano_sight_reading_config';

const DEFAULT_CONFIG: GenerationConfig = {
  style: 'random',
  keyCenter: 'random',
  length: 'random'
};

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'settings' | 'reading'>('settings');

  const [config, setConfig] = useState<GenerationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Could not read saved settings from localStorage:', err);
    }
    return DEFAULT_CONFIG;
  });

  const [history, setHistory] = useState<GeneratedResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const handleConfigChange = (newConfig: GenerationConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (err) {
      console.warn('Could not save settings to localStorage:', err);
    }
  };

  const handleStartReading = () => {
    // Generate fresh piece
    const result = generateSightReadingPiece(config);
    setHistory([result]);
    setHistoryIndex(0);
    setViewMode('reading');

    // Request fullscreen mode
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen API may be blocked without direct user gesture in some browsers
      });
    }
  };

  const handleGenerateNext = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    } else {
      // Generate new piece and append to history
      const newResult = generateSightReadingPiece(config);
      setHistory(prev => [...prev, newResult]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleGeneratePrev = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setViewMode('settings');
  };

  return (
    <div>
      {viewMode === 'settings' ? (
        <SettingsScreen
          config={config}
          onChangeConfig={handleConfigChange}
          onStartReading={handleStartReading}
        />
      ) : (
        <ReadingView
          currentPieceResult={history[historyIndex]}
          onGenerateNext={handleGenerateNext}
          onGeneratePrev={handleGeneratePrev}
          onExit={handleExit}
          historyIndex={historyIndex}
          historyCount={history.length}
        />
      )}
    </div>
  );
};

export default App;
