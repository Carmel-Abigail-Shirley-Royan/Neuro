import React from 'react';

const SENSORS = [
  {
    icon: '⚡',
    name: 'EMG Sensor',
    model: 'MyoWare Muscle Sensor',
    color: 'var(--cyan)',
    desc: 'Captures electrical activity produced by skeletal muscles. Seizures cause abnormal, high-amplitude muscle contractions that appear as spikes in EMG signals.',
  },
  {
    icon: '♥',
    name: 'Heart Rate Sensor',
    model: 'Pulse Sensor / MAX30102',
    color: 'var(--red)',
    desc: 'Photoplethysmography (PPG) sensor measures blood volume changes. Tachycardia (>150 BPM) or sudden heart rate changes are common seizure indicators.',
  },
  {
    icon: '🌡',
    name: 'Temperature Sensor',
    model: 'LM35 Analog IC',
    color: 'var(--amber)',
    desc: 'Measures core body temperature. Post-ictal hyperthermia (fever after seizure) is a well-documented phenomenon. LM35 outputs 10mV/°C for precision analog reading.',
  },
  {
    icon: '⟳',
    name: 'Gyroscope / IMU',
    model: 'MPU-6050 (6-axis)',
    color: 'var(--purple)',
    desc: 'Measures angular velocity in 3 axes (°/s). Seizure-related convulsions produce characteristic rhythmic, high-magnitude motion patterns detectable via gyroscope.',
  },
];

const FEATURES = [
  { icon: '🧠', title: 'AI Seizure Detection', desc: 'LightGBM ensemble model trained on multi-modal sensor fusion data' },
  { icon: '📡', title: 'Real-Time Monitoring', desc: 'WebSocket-based streaming with sub-100ms latency from Arduino' },
  { icon: '🚨', title: 'Emergency Dispatch', desc: 'Automatic SMS + phone calls via Twilio to emergency contacts' },
  { icon: '📍', title: 'GPS Location', desc: 'Browser Geolocation API with live map and Google Maps link in alerts' },
  { icon: '📊', title: 'Clinical Dashboard', desc: 'Medical-grade visualization with waveforms, trends, and history' },
  { icon: '🔐', title: 'Secure Access', desc: 'JWT authentication with bcrypt password hashing' },
];

export default function AboutPage() {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroLogo}>
          <svg width="64" height="64" viewBox="0 0 52 52">
            <defs>
              <linearGradient id="lg3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0d7fff" />
              </linearGradient>
            </defs>
            <circle cx="26" cy="26" r="24" fill="none" stroke="url(#lg3)" strokeWidth="1.5" />
            <path d="M14 26 Q14 18 20 18 Q22 14 26 14 Q30 14 32 18 Q38 18 38 26 Q38 32 32 34 Q30 38 26 38 Q22 38 20 34 Q14 32 14 26Z"
              fill="none" stroke="url(#lg3)" strokeWidth="1.2" />
            <polyline points="8,26 16,26 19,20 22,32 25,24 28,28 31,26 44,26"
              fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 style={styles.heroTitle}>NEUROGUARD</h1>
        <p style={styles.heroSubtitle}>Real-Time AI Powered Seizure Detection & Emergency Response System</p>
        <div style={styles.heroBadges}>
          <Badge label="Hackathon 2024" />
          <Badge label="IoT + AI" />
          <Badge label="Medical Grade" />
          <Badge label="Open Source" />
        </div>
      </div>

      {/* Description */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>ABOUT THE SYSTEM</h2>
        <p style={styles.para}>
          NeuroGuard is a wearable IoT medical device designed to detect epileptic seizures in real time using multi-modal sensor fusion and a trained LightGBM machine learning model. The system continuously monitors physiological signals from an Arduino-based hardware platform and streams data to a cloud-connected web dashboard for caregivers, physicians, and emergency responders.
        </p>
        <p style={styles.para}>
          Upon seizure detection, NeuroGuard automatically dispatches SMS alerts and initiates phone calls to pre-configured emergency contacts via the Twilio API, including the patient's live GPS location as a Google Maps link — enabling faster emergency response and peace of mind for families and healthcare providers.
        </p>
      </div>

      {/* Sensors */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>SENSORS & HARDWARE</h2>
        <div style={styles.sensorGrid}>
          {SENSORS.map(s => (
            <div key={s.name} style={styles.sensorCard}>
              <div style={{ ...styles.sensorIcon, color: s.color }}>{s.icon}</div>
              <div style={styles.sensorName}>{s.name}</div>
              <div style={{ ...styles.sensorModel, color: s.color }}>{s.model}</div>
              <p style={styles.sensorDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Section */}
      <div style={styles.aiSection}>
        <div style={styles.aiLeft}>
          <h2 style={styles.sectionTitle}>AI-BASED DETECTION</h2>
          <p style={styles.para}>
            The core ML model is a LightGBM (Light Gradient Boosting Machine) classifier trained on labeled multi-sensor data. Features include EMG amplitude, pulse rate, temperature, and gyroscope magnitude computed over sliding windows.
          </p>
          <p style={styles.para}>
            The model achieves high precision by combining multiple weak signals — no single sensor is sufficient, but together they form a robust seizure signature. A rule-based fallback system activates when the model file is unavailable.
          </p>
          <div style={styles.modelStats}>
            <Stat label="Algorithm" value="LightGBM" />
            <Stat label="Input Features" value="6" />
            <Stat label="Output Classes" value="2 (Normal / Seizure)" />
            <Stat label="Update Rate" value="10 Hz" />
          </div>
        </div>
        <div style={styles.aiRight}>
          <div style={styles.signalFlow}>
            {['Arduino Sensors', 'PySerial', 'FastAPI', 'LightGBM Model', 'WebSocket', 'React Dashboard'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div style={styles.flowStep}>{step}</div>
                {i < arr.length - 1 && <div style={styles.flowArrow}>↓</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>KEY FEATURES</h2>
        <div style={styles.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <div style={styles.featureTitle}>{f.title}</div>
              <div style={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div style={styles.stackSection}>
        <h2 style={styles.sectionTitle}>TECH STACK</h2>
        <div style={styles.stackRow}>
          {['Python / FastAPI', 'React.js', 'WebSockets', 'SQLite', 'LightGBM', 'PySerial', 'Twilio', 'JWT Auth', 'Recharts'].map(t => (
            <div key={t} style={styles.stackTag}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ label }) {
  return (
    <div style={{
      padding: '4px 12px',
      background: 'rgba(0,212,255,0.1)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 20,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--cyan)',
      letterSpacing: '0.06em',
    }}>{label}</div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)' }}>{value}</span>
    </div>
  );
}

const styles = {
  page: {
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 36,
    height: '100%',
    overflow: 'auto',
    maxWidth: 1000,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '40px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroLogo: {
    filter: 'drop-shadow(0 0 24px rgba(0,212,255,0.5))',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: '0.15em',
    background: 'linear-gradient(135deg, #00d4ff, #0d7fff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--text-secondary)',
    maxWidth: 500,
  },
  heroBadges: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.15em',
    color: 'var(--cyan)',
    paddingBottom: 8,
    borderBottom: '1px solid var(--border)',
  },
  para: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
  },
  sensorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  sensorCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sensorIcon: { fontSize: 24 },
  sensorName: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
  },
  sensorModel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.06em',
  },
  sensorDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    marginTop: 6,
  },
  aiSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 200px',
    gap: 24,
    alignItems: 'start',
  },
  aiLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  aiRight: {
    display: 'flex',
    justifyContent: 'center',
  },
  signalFlow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
  },
  flowStep: {
    padding: '8px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    width: 160,
  },
  flowArrow: {
    color: 'var(--cyan)',
    fontSize: 14,
    padding: '2px 0',
  },
  modelStats: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 16px',
    marginTop: 8,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  featureCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  featureIcon: { fontSize: 22 },
  featureTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 600,
  },
  featureDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },
  stackSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    paddingBottom: 40,
  },
  stackRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  stackTag: {
    padding: '6px 14px',
    background: 'rgba(0,212,255,0.06)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
  },
};
