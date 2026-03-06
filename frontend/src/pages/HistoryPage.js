import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/api';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (e) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Pulse (BPM)', 'Temperature (°C)', 'EMG (mV)', 'Gyro X', 'Gyro Y', 'Gyro Z', 'Location'];
    const rows = history.map(e => [
      e.timestamp, e.pulse, e.temperature, e.emg,
      e.gyro_x, e.gyro_y, e.gyro_z, e.location
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroguard-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>SEIZURE EVENT HISTORY</h2>
          <p style={styles.subtitle}>{history.length} events recorded</p>
        </div>
        <button style={styles.exportBtn} onClick={exportCSV} disabled={history.length === 0}>
          ↓ EXPORT CSV
        </button>
      </div>

      {loading && (
        <div style={styles.loading}>
          <div style={styles.loadingDot} /> Loading history...
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {!loading && history.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={styles.emptyTitle}>No Seizure Events Recorded</div>
          <div style={styles.emptySubtitle}>Events will appear here when NeuroGuard detects seizure activity</div>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {['#', 'TIMESTAMP', 'PULSE (BPM)', 'TEMP (°C)', 'EMG (mV)', 'GYRO X', 'GYRO Y', 'GYRO Z', 'LOCATION'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((e, i) => (
                <tr key={e.id} style={{ ...styles.tr, animationDelay: `${i * 0.02}s` }}>
                  <td style={{ ...styles.td, ...styles.tdId }}>{history.length - i}</td>
                  <td style={{ ...styles.td, ...styles.tdMono }}>
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--red)' }}>{e.pulse?.toFixed(0)}</td>
                  <td style={{ ...styles.td, color: 'var(--amber)' }}>{e.temperature?.toFixed(1)}</td>
                  <td style={{ ...styles.td, color: 'var(--cyan)' }}>{e.emg?.toFixed(4)}</td>
                  <td style={styles.td}>{e.gyro_x?.toFixed(3)}</td>
                  <td style={styles.td}>{e.gyro_y?.toFixed(3)}</td>
                  <td style={styles.td}>{e.gyro_z?.toFixed(3)}</td>
                  <td style={{ ...styles.td, ...styles.tdMono, color: 'var(--text-muted)' }}>
                    {e.location ? (
                      <a href={e.location} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                        View ↗
                      </a>
                    ) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    height: '100%',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  exportBtn: {
    padding: '9px 18px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid var(--border-glow)',
    borderRadius: 6,
    color: 'var(--cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  loadingDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--cyan)',
    animation: 'blink 1s ease infinite',
  },
  error: {
    padding: 16,
    background: 'var(--red-dim)',
    border: '1px solid var(--red)',
    borderRadius: 8,
    color: 'var(--red)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 60,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  },
  tableWrap: {
    overflow: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 10,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  thead: {
    background: 'var(--bg-secondary)',
    position: 'sticky',
    top: 0,
  },
  th: {
    padding: '11px 14px',
    textAlign: 'left',
    fontSize: 9,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    fontWeight: 600,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid rgba(26,58,92,0.5)',
    transition: 'background 0.15s',
    animation: 'fadeUp 0.3s ease both',
  },
  td: {
    padding: '10px 14px',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  tdId: {
    color: 'var(--text-muted)',
    fontSize: 10,
  },
  tdMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
  },
};
