import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { SensorContext } from './DashboardLayout';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import toast from 'react-hot-toast';
import { getContacts, addContact, deleteContact, triggerEmergency } from '../services/api';
import EmergencyPanel from '../components/EmergencyPanel';
import LiveMap from '../components/LiveMap';

export default function Dashboard() {
  const { sensorData, connected, prediction, chartData, sendLocation } = useContext(SensorContext);
  const isSeizure = prediction === 'Seizure Detected';
  const alarmRef = useRef(null);
  const prevPredRef = useRef('Normal');
  const [location, setLocation] = useState(null);


  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          sendLocation(loc.lat, loc.lng);
        },
        err => console.warn('[GPS]', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [sendLocation]);

  // Seizure alerts
  useEffect(() => {
    if (isSeizure && prevPredRef.current !== 'Seizure Detected') {
      toast.error('⚠️ SEIZURE DETECTED! Emergency response activated.', {
        duration: 8000,
        style: {
          background: '#1a0010',
          border: '1px solid var(--red)',
          color: '#ff3366',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }
      });
      // Play alert sound
      playAlarm();
    }
    prevPredRef.current = prediction;
  }, [isSeizure, prediction]);

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) { /* ignore */ }
  };

  const sd = sensorData || {};

  return (
    <div style={styles.page}>
      {/* Top alert banner */}
      {isSeizure && (
        <div style={styles.alertBanner}>
          <span style={styles.alertIcon}>⚠</span>
          <span style={styles.alertText}>SEIZURE DETECTED — EMERGENCY RESPONSE ACTIVATED</span>
          <span style={styles.alertIcon}>⚠</span>
        </div>
      )}

      {/* Normal status */}
      {!isSeizure && (
        <div style={styles.normalBanner}>
          <span>●</span>
          <span>You're Normal – Stay Relaxed & Safe 💚</span>
          <span style={styles.ts}>
            {sensorData?.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : '--'}
          </span>
        </div>
      )}

      <div style={styles.grid}>
        {/* Sensor Cards Row */}
        <div style={styles.cardsRow}>
          <SensorCard
            label="PULSE RATE"
            value={sd.pulse_bpm ?? '--'}
            unit="BPM"
            icon="♥"
            color="var(--red)"
            normal={sd.pulse_bpm > 45 && sd.pulse_bpm < 130}
          />
          <SensorCard
            label="TEMPERATURE"
            value={sd.temperature_c ?? '--'}
            unit="°C"
            icon="🌡"
            color="var(--amber)"
            normal={sd.temperature_c > 36 && sd.temperature_c < 38}
          />
          <SensorCard
            label="EMG SIGNAL"
            value={sd.emg_mv != null ? sd.emg_mv.toFixed(3) : '--'}
            unit="mV"
            icon="⚡"
            color="var(--cyan)"
            normal={sd.emg_mv < 2.0}
          />
          <SensorCard
            label="GYRO X/Y/Z"
            value={sd.gyro_x != null
              ? `${sd.gyro_x.toFixed(2)} / ${(sd.gyro_y || 0).toFixed(2)} / ${(sd.gyro_z || 0).toFixed(2)}`
              : '--'
            }
            unit="°/s"
            icon="⟳"
            color="var(--purple)"
            normal
          />
        </div>

        {/* Charts + Map */}
        <div style={styles.chartsRow}>
          {/* EMG Waveform */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartLabel}>EMG WAVEFORM</span>
              <span style={styles.chartUnit}>millivolts (mV)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData.emg}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,212,255,0.06)" />
                <XAxis dataKey="t" hide />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
                  formatter={(v) => [`${v.toFixed(4)} mV`, 'EMG']}
                />
                <Line type="monotone" dataKey="v" stroke="var(--cyan)" strokeWidth={1.5}
                  dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pulse Waveform */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartLabel}>PULSE WAVEFORM</span>
              <span style={styles.chartUnit}>beats per minute</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData.pulse}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,51,102,0.06)" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[40, 160]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
                  formatter={(v) => [`${v} BPM`, 'Pulse']}
                />
                <Line type="monotone" dataKey="v" stroke="var(--red)" strokeWidth={1.5}
                  dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Map + Emergency */}
        <div style={styles.bottomRow}>
          <LiveMap location={location} isSeizure={isSeizure} />
          <EmergencyPanel
            sensorData={sensorData}
            location={location}
            isSeizure={isSeizure}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sensor Card Component ───────────────────────────────────────
function SensorCard({ label, value, unit, icon, color, normal }) {
  return (
    <div style={{
      ...styles.card,
      borderColor: normal === false ? 'var(--red)' : 'var(--border)',
      boxShadow: normal === false ? '0 0 20px var(--red-dim)' : 'none',
    }}>
      <div style={styles.cardTop}>
        <span style={{ ...styles.cardIcon, color }}>{icon}</span>
        <div style={{
          ...styles.cardDot,
          background: normal === false ? 'var(--red)' : color,
          boxShadow: `0 0 6px ${normal === false ? 'var(--red)' : color}`,
          animation: 'blink 2s ease infinite',
        }} />
      </div>
      <div style={{ ...styles.cardValue, color }}>{value}</div>
      <div style={styles.cardUnit}>{unit}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",   // full page height
    height: "auto",
    overflowY: "auto",    // allow scrolling
    padding: 20,
    paddingBottom: 60,
    gap: 16
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '12px 20px',
    background: 'var(--red-dim)',
    border: '1px solid var(--red)',
    borderRadius: 8,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    letterSpacing: '0.12em',
    color: 'var(--red)',
    animation: 'blink 0.8s ease infinite',
    flexShrink: 0,
  },
  alertIcon: { fontSize: 18 },
  alertText: {},
  normalBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'var(--green-dim)',
    border: '1px solid rgba(0,255,136,0.3)',
    borderRadius: 8,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--green)',
    flexShrink: 0,
  },
  ts: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'rgba(0,255,136,0.5)',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: '0 1 auto',
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    transition: 'all 0.3s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: { fontSize: 20 },
  cardDot: { width: 6, height: 6, borderRadius: '50%' },
  cardValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: '-0.02em',
  },
  cardUnit: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
  },
  cardLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.12em',
    marginTop: 4,
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
    gap: 12,
  },
  chartCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    letterSpacing: '0.12em',
  },
  chartUnit: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  bottomRow: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
  gap: 12,
},
  manualTriggerBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    background: 'linear-gradient(135deg, #ff3366, #ff0033)',
    border: '1px solid #ff3366',
    borderRadius: '8px',
    color: '#fff',
    padding: '10px 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 0 15px rgba(255, 51, 102, 0.4)',
    transition: 'transform 0.2s',
  },
};
