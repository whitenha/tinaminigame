"use client";

import React, { useState } from 'react';
import styles from '@/games/whackamole/WhackAMolePlayer.module.css';

export default function MoleAlignDevPage() {
  // Global settings for the inner mole visuals (these are locked but tweakable for testing)
  const [globalParams, setGlobalParams] = useState({
    moleScale: 7.5,
    moleBottom: -18,
    moleLeft: 50,
    moleTranslateY: -13,
    signTop: -58,
    signLeft: 27,
    fontSize: 3.5
  });

  // 9 independent slots!
  const [slots, setSlots] = useState([
    { id: 0, top: 61, left: 40.5, scale: 0.65 },
    { id: 1, top: 61, left: 52.5, scale: 0.65 },
    { id: 2, top: 61, left: 64.5, scale: 0.65 },
    { id: 3, top: 74, left: 39.5, scale: 0.65 },
    { id: 4, top: 74, left: 52.5, scale: 0.65 },
    { id: 5, top: 74.5, left: 65, scale: 0.65 },
    { id: 6, top: 89.5, left: 39, scale: 0.65 },
    { id: 7, top: 89.5, left: 53, scale: 0.65 },
    { id: 8, top: 89.5, left: 67, scale: 0.65 }
  ]);

  const [activeSlots, setActiveSlots] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const [selectedSlot, setSelectedSlot] = useState(7); // Default editing slot 8 (id 7)

  const handleGlobalChange = (e) => {
    const { name, value } = e.target;
    setGlobalParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSlotChange = (e) => {
    const { name, value } = e.target;
    setSlots(prev => prev.map(slot => 
      slot.id === selectedSlot ? { ...slot, [name]: parseFloat(value) } : slot
    ));
  };

  const toggleSlot = (index) => {
    setActiveSlots(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const currentSlotData = slots.find(s => s.id === selectedSlot) || slots[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#2d3436' }}>
      
      {/* ── BẢNG ĐIỀU KHIỂN (CONTROL PANEL) ── */}
      <div style={{ width: '450px', background: '#fff', padding: '24px', overflowY: 'auto', borderRight: '4px solid #000' }}>
        <h2 style={{ marginBottom: '20px', fontFamily: 'sans-serif' }}>🔧 Tọa Độ Độc Lập</h2>
        
        <div style={{ marginBottom: '20px', padding: '15px', background: '#ffeaa7', borderRadius: '8px' }}>
          <h4>Chọn Lỗ Kéo Thả Trực Tiếp</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
            {slots.map(s => (
              <label key={s.id} style={{ 
                border: selectedSlot === s.id ? '2px solid #d63031' : '1px solid #ccc', 
                padding: '8px', textAlign: 'center', cursor: 'pointer', 
                background: selectedSlot === s.id ? '#fab1a0' : (activeSlots.includes(s.id) ? '#e8f8f0' : '#f1f2f6') 
              }}>
                <input type="radio" checked={selectedSlot === s.id} onChange={() => setSelectedSlot(s.id)} style={{ display: 'none' }} />
                Lỗ {s.id+1}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px', borderLeft: '4px solid #d63031', paddingLeft: '15px' }}>
          <h4 style={{ color: '#d63031' }}>Chỉnh Tọa Độ Cho [ Lỗ {selectedSlot + 1} ]</h4>
          <p style={{fontSize: '12px', color: '#666'}}>Dùng thanh kéo để dời con chuột này đến đúng miệng hố trong ảnh 3D.</p>
          
          <label style={{ display: 'block', marginTop: '10px' }}>
            Top (% - Lên / Xuống): {currentSlotData.top}
            <input type="range" name="top" min="0" max="100" step="0.5" value={currentSlotData.top} onChange={handleSlotChange} style={{ width: '100%' }} />
          </label>
          
          <label style={{ display: 'block', marginTop: '10px' }}>
            Left (% - Trái / Phải): {currentSlotData.left}
            <input type="range" name="left" min="0" max="100" step="0.5" value={currentSlotData.left} onChange={handleSlotChange} style={{ width: '100%' }} />
          </label>
          
          <label style={{ display: 'block', marginTop: '10px' }}>
            X-Tượng Hình (Phóng to/nhỏ vì xa/gần): {currentSlotData.scale}
            <input type="range" name="scale" min="0.5" max="2" step="0.05" value={currentSlotData.scale} onChange={handleSlotChange} style={{ width: '100%' }} />
          </label>
        </div>

        <hr style={{ margin: '30px 0' }}/>

        <div style={{ marginBottom: '20px' }}>
          <h4>Vị trí Lõi Chuột & Khung Chữ (Global)</h4>
          <p style={{fontSize: '12px', color: '#666'}}>Cái này thay đổi tất cả các con chuột.</p>
          <label style={{ display: 'block', marginTop: '10px' }}>
            Scale Core: {globalParams.moleScale}
            <input type="range" name="moleScale" min="1" max="20" step="0.1" value={globalParams.moleScale} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginTop: '10px' }}>
            Bottom (%): {globalParams.moleBottom}
            <input type="range" name="moleBottom" min="-50" max="50" step="1" value={globalParams.moleBottom} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginTop: '10px' }}>
            TranslateY (%): {globalParams.moleTranslateY}
            <input type="range" name="moleTranslateY" min="-50" max="50" step="1" value={globalParams.moleTranslateY} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>

          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px dashed #ccc' }}/>
          
          <label style={{ display: 'block', marginTop: '10px' }}>
            (CHỮ) Top cqh (Lên xuống): {globalParams.signTop}
            <input type="range" name="signTop" min="-80" max="0" step="0.5" value={globalParams.signTop} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginTop: '10px' }}>
            (CHỮ) Left % (Trái phải): {globalParams.signLeft}
            <input type="range" name="signLeft" min="0" max="100" step="1" value={globalParams.signLeft} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginTop: '10px' }}>
            (CHỮ) Font Size cqw: {globalParams.fontSize}
            <input type="range" name="fontSize" min="1" max="8" step="0.1" value={globalParams.fontSize} onChange={handleGlobalChange} style={{ width: '100%' }} />
          </label>
        </div>

        <button 
          style={{ width: '100%', padding: '15px', background: '#0984e3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => {
            console.log("----- TỌA ĐỘ 9 LỖ -----");
            console.log(slots);
            console.log("----- THÔNG SỐ CHUỘT / CHỮ GLOBAL -----");
            console.log(globalParams);
            alert("Đã In Tọa Độ Ra Console (F12)!");
          }}
        >
          [LƯU KẾT QUẢ] In Thông Số Ra Bảng Console (F12)
        </button>
      </div>

      {/* ── MÀN HÌNH GAME (PREVIEW) ── */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e272e' }}>
        
        <div className={styles.gameAreaWrapper} style={{ width: '100%', maxWidth: '1000px', position: 'relative' }}>
          <div className={styles.gameStage}>
            
            <div className={styles.moleGrid}>
              {slots.map(slot => (
                <div 
                  key={slot.id} 
                  className={styles.holeContainer}
                  style={{ 
                    top: `${slot.top}%`, 
                    left: `${slot.left}%`,
                    transform: `translate(-50%, -50%) scale(${slot.scale})`,
                    border: selectedSlot === slot.id ? '2px dashed #ff7675' : 'none',
                    zIndex: selectedSlot === slot.id ? 10 : 2
                  }}
                  onClick={() => {
                    if (!activeSlots.includes(slot.id)) toggleSlot(slot.id);
                    setSelectedSlot(slot.id);
                  }}
                >
                  <div className={styles.hole}></div>

                  {activeSlots.includes(slot.id) && (
                    <button 
                      className={styles.mole}
                      style={{ 
                        bottom: `${globalParams.moleBottom}%`,
                        left: `${globalParams.moleLeft}%`
                      }}
                    >
                      <div 
                        className={styles.signBoard}
                        style={{
                          top: `${globalParams.signTop}cqh`,
                          left: `${globalParams.signLeft}%`
                        }}
                      >
                        <span 
                          className={styles.signText}
                          style={{ fontSize: `${globalParams.fontSize}cqw` }}
                        >
                          TEST {slot.id + 1}
                        </span>
                      </div>

                      <div className={styles.moleBody}>
                        <img 
                          src="/sprites/mole-sign.png" 
                          alt="" 
                          className={styles.moleImg} 
                          style={{
                            transform: `scale(${globalParams.moleScale}) translateY(${globalParams.moleTranslateY}%)`,
                            transformOrigin: 'bottom center'
                          }}
                        />
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
