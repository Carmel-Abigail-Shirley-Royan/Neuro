import React from 'react';

// Use iframe-based map to avoid Leaflet CSS import complexity in CRA
export default function LiveMap({ location, isSeizure }) {
  const lat = location?.lat ?? 12.9716;
  const lng = location?.lng ?? 77.5946;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div style={{
      ...styles.container,
      borderColor: isSeizure ? 'var(--red)' : 'var(--border)',
      boxShadow: isSeizure ? '0 0 20px var(--red-dim)' : 'none',
    }}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>📍</span>
          <span style={styles.label}>LIVE LOCATION</span>
        </div>
        <div style={styles.coords}>
          {location
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : 'Acquiring GPS...'
          }
        </div>
      </div>

      {location ? (
        <iframe
          title="Live Location Map"
          style={styles.map}
          src={mapUrl}
          allowFullScreen
        />
      ) : (
        <div style={styles.noGps}>
          <div style={styles.spinner}>⟳</div>
          <span>Acquiring GPS signal...</span>
        </div>
      )}

      {location && (
        <div style={styles.footer}>
          <a
            href={`https://maps.google.com/?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Open in Google Maps ↗
          </a>
          <span style={styles.updateText}>Updates every 5s</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  icon: { fontSize: 14 },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    letterSpacing: '0.12em',
  },
  coords: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  map: {
    flex: 1,
    width: '100%',
    border: 'none',
    minHeight: 200,
  },
  noGps: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: 40,
  },
  spinner: {
    fontSize: 28,
    color: 'var(--cyan)',
    animation: 'blink 1s ease infinite',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  link: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--cyan)',
    textDecoration: 'none',
  },
  updateText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
  },
};
