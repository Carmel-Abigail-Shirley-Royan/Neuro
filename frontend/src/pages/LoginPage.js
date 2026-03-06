import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    let userCredential;
    
    if (isRegister) {
      // 1. Create user in Firebase Auth 
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Optional: Set the display name
      await updateProfile(userCredential.user, { displayName: name });
    } else {
      // 2. Sign in with Firebase Auth 
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    }

    // 3. Get the ID token for the backend
    const token = await userCredential.user.getIdToken();
    
    const userData = {
      id: userCredential.user.uid,
      email: userCredential.user.email,
      name: userCredential.user.displayName || name || "User"
    };

    // 4. Update your local AuthContext state
    authLogin(token, userData); 
    
    toast.success(isRegister ? "Account Created!" : "Welcome back!");
    navigate('/');
  } catch (err) {
    // Firebase provides specific error messages
    toast.error(err.message || 'Authentication failed');
  } finally {
    setLoading(false);
  }
};
  const handleLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('ng_token', token); // api.js uses this token
    // Redirect to Dashboard
  } catch (error) {
    console.error("Login failed", error);
  }
};

  return (
    <div style={styles.root}>
      {/* Animated background grid */}
      <div style={styles.bgGrid} />
      <div style={styles.scanline} />

      <div style={styles.container}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.logoMark}>
            <img src={logo} alt="NeuroGuard Logo" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--cyan)', boxShadow: '0 0 20px var(--cyan-glow)' }} />
          </div>
          <h1 style={styles.appName}>NEUROGUARD</h1>
          <p style={styles.caption}>Real-Time AI Powered Seizure Detection & Emergency Response</p>
        </div>

        {/* Card */}
        <form style={styles.card} onSubmit={handleSubmit}>
          <div style={styles.cardHeader}>
            <div style={styles.indicator} />
            <span style={styles.cardTitle}>{isRegister ? 'CREATE ACCOUNT' : 'SECURE ACCESS'}</span>
          </div>

          {isRegister && (
            <div style={styles.field}>
              <label style={styles.label}>FULL NAME</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>EMAIL ADDRESS</label>
            <input
              style={styles.input}
              type="email"
              placeholder="jane_smith@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button style={{
            ...styles.btn,
            ...(loading ? styles.btnLoading : {})
          }} type="submit" disabled={loading}>
            {loading ? 'AUTHENTICATING...' : (isRegister ? 'REGISTER ACCOUNT' : 'ACCESS SYSTEM')}
          </button>

          <button
            type="button"
            style={styles.toggle}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Already have access? Login' : "Don't have access? Register"}
          </button>
        </form>

        <p style={styles.footer}>
          NeuroGuard v1.0 • Medical IoT Platform • Secured with AES-256
        </p>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    animation: 'none',
  },
  scanline: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
    animation: 'scanline 4s linear infinite',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
    width: '100%',
    maxWidth: 420,
    padding: '0 20px',
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    animation: 'fadeUp 0.6s ease',
  },
  logoMark: {
    filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.5))',
  },
  appName: {
    fontFamily: 'var(--font-display)',
    fontSize: 38,
    fontWeight: 700,
    letterSpacing: '0.15em',
    background: 'linear-gradient(135deg, #00d4ff, #0d7fff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: 'none',
  },
  caption: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxShadow: '0 0 60px rgba(0,212,255,0.06)',
    animation: 'fadeUp 0.6s ease 0.1s both',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    borderBottom: '1px solid var(--border)',
  },
  indicator: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--cyan)',
    boxShadow: '0 0 8px var(--cyan)',
    animation: 'blink 2s ease infinite',
  },
  cardTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.12em',
    color: 'var(--cyan)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
  },
  input: {
    background: 'rgba(0,212,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  btn: {
    background: 'linear-gradient(135deg, #0055cc, #0d7fff)',
    border: 'none',
    borderRadius: 6,
    padding: '12px',
    color: '#fff',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 4,
  },
  btnLoading: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  toggle: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  footer: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    textAlign: 'center',
    letterSpacing: '0.05em',
    animation: 'fadeUp 0.6s ease 0.2s both',
  },
};
