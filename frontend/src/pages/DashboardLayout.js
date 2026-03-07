import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSensorData } from '../hooks/useSensorData';
import logo from '../assets/logo.jpg';

export const SensorContext = React.createContext(null);

const NAV_ITEMS = [
  { path: '/', label: 'DASHBOARD', icon: '⬡', exact: true },
  { path: '/history', label: 'HISTORY', icon: '◈' },
  { path: '/about', label: 'ABOUT', icon: '◉' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sensorState = useSensorData();
  const { connected, prediction } = sensorState;

  const [mobile, setMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSeizure = prediction === 'Seizure Detected';

  useEffect(() => {
    const handleResize = () => {
      setMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SensorContext.Provider value={sensorState}>
      <div style={styles.root}>
        {isSeizure && <div style={styles.seizureOverlay} />}

        {/* Mobile Top Bar */}
        {mobile && (
          <div style={styles.mobileHeader}>
            <button
              style={styles.hamburger}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>

            <div style={styles.mobileTitle}>NEUROGUARD</div>
          </div>
        )}

        {/* Sidebar */}
        <aside
          style={{
            ...styles.sidebar,
            ...(mobile && !sidebarOpen ? styles.sidebarHidden : {}),
          }}
        >
          {/* Logo */}
          <div style={styles.logoArea}>
            <img
              src={logo}
              alt="NeuroGuard"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--cyan)',
              }}
            />

            <div>
              <div style={styles.appName}>NEUROGUARD</div>
              <div style={styles.version}>v1.0 MEDICAL</div>
            </div>
          </div>

          {/* Status */}
          <div style={styles.statusBar}>
            <div
              style={{
                ...styles.dot,
                background: connected ? 'var(--green)' : 'var(--red)',
              }}
            />
            <span style={styles.statusText}>
              {connected ? 'SENSOR ONLINE' : 'RECONNECTING'}
            </span>
          </div>

          {/* Nav */}
          <nav style={styles.nav}>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                })}
                onClick={() => mobile && setSidebarOpen(false)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div style={styles.userArea}>
            <div style={styles.avatar}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <div style={styles.userInfo}>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>

            <button style={styles.logoutBtn} onClick={handleLogout}>
              ⏻
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={styles.main(mobile)}>
          <Outlet />
        </main>
      </div>
    </SensorContext.Provider>
  );
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    overflow: 'hidden',
  },

  seizureOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(255,51,102,0.05)',
    pointerEvents: 'none',
    zIndex: 999,
  },

  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    zIndex: 200,
  },

  mobileTitle: {
    fontFamily: 'var(--font-display)',
    color: 'var(--cyan)',
    marginLeft: 12,
  },

  hamburger: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    color: 'var(--cyan)',
    cursor: 'pointer',
  },

  sidebar: {
    width: 220,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    // Use fixed height and ensure it is on top
    height: '100vh',
    position: 'sticky',
    top: 0,
    padding: '20px 0 0',
    zIndex: 300,
  },

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px',
    flex: 1,
    // Add this to make ONLY the menu items scroll if they are too long
    overflowY: 'auto', 
  },

  userArea: {
    display: 'flex',
    alignItems: 'center',
    padding: 20,
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)', // Keep background solid so it covers content behind it
    marginTop: 'auto', // Pushes it to the very bottom of the sidebar
  },

  sidebarHidden: {
    transform: 'translateX(-100%)',
    position: 'absolute',
  },

  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 20px 20px',
  },

  appName: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    color: 'var(--cyan)',
  },

  version: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },

  statusBar: {
    display: 'flex',
    gap: 8,
    padding: '8px 20px',
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
  },

  statusText: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },


  navItem: {
    padding: '10px',
    textDecoration: 'none',
    color: 'var(--text-muted)',
    borderRadius: 6,
  },

  navItemActive: {
    color: 'var(--cyan)',
    background: 'var(--cyan-glow)',
  },

  navIcon: { marginRight: 8 },


  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--cyan)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userInfo: { flex: 1, marginLeft: 8 },

  userName: { fontSize: 12 },

  userEmail: { fontSize: 9, color: 'var(--text-muted)' },

  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },

  main: (mobile) => ({
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg-primary)',
    paddingTop: mobile ? 52 : 0,
  }),
};