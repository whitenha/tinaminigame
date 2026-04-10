'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './AudioSettings.module.css';
import { getSoundManager } from '@/lib/sounds';

export default function AudioSettings() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Default values
  const [musicVol, setMusicVol] = useState(50); // mapped to 0.5
  const [effectVol, setEffectVol] = useState(50); // mapped to 0.5
  const [voiceVol, setVoiceVol] = useState(50); // mapped to 0.5

  const containerRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem('tina_musicVol');
      const savedEffect = localStorage.getItem('tina_effectVol');
      const savedVoice = localStorage.getItem('tina_voiceVol');

      if (savedMusic !== null) setMusicVol(parseInt(savedMusic, 10));
      if (savedEffect !== null) setEffectVol(parseInt(savedEffect, 10));
      if (savedVoice !== null) setVoiceVol(parseInt(savedVoice, 10));
    }
    
    // Close on click outside
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync to sounds.js and tts.js via localStorage when values change
  useEffect(() => {
    const sounds = getSoundManager();
    sounds.musicVolume = musicVol / 100;
    sounds.volume = effectVol / 100;
    
    localStorage.setItem('tina_musicVol', musicVol.toString());
    localStorage.setItem('tina_effectVol', effectVol.toString());
    localStorage.setItem('tina_voiceVol', voiceVol.toString());

    // Trigger an event to let TTS or other components know voice volume changed
    window.dispatchEvent(new Event('tina_voice_volume_changed'));
    window.dispatchEvent(new CustomEvent('tina_music_volume_changed', { detail: musicVol }));
  }, [musicVol, effectVol, voiceVol]);

  const testEffect = () => {
    getSoundManager().click();
  };

  const testVoice = () => {
    import('@/lib/tts').then(({ speak, cancelSpeech }) => {
      cancelSpeech(); // Stop any currently playing speech to avoid overlap
      speak('Âm lượng giọng đọc', { forceLang: 'vi-VN' });
    });
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.title}>Cài Đặt Âm Thanh</div>
          
          <div className={styles.sliderRow}>
            <div className={styles.label}>
              <span>🎵 Nhạc Nền</span>
              <span>{musicVol}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={musicVol} 
              onChange={(e) => setMusicVol(Number(e.target.value))}
              className={styles.slider} 
            />
          </div>

          <div className={styles.sliderRow}>
            <div className={styles.label}>
              <span>✨ Hiệu Ứng</span>
              <span>{effectVol}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={effectVol} 
              onChange={(e) => setEffectVol(Number(e.target.value))}
              onMouseUp={testEffect}
              onTouchEnd={testEffect}
              className={styles.slider} 
            />
          </div>

          <div className={styles.sliderRow}>
            <div className={styles.label}>
              <span>🗣️ Giọng Đọc</span>
              <span>{voiceVol}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={voiceVol} 
              onChange={(e) => setVoiceVol(Number(e.target.value))}
              onMouseUp={testVoice}
              onTouchEnd={testVoice}
              className={styles.slider} 
            />
          </div>
        </div>
      )}
      
      <button 
        className={styles.settingsBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title="Cài đặt âm thanh"
      >
        🔊
      </button>
    </div>
  );
}
