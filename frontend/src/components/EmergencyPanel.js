import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getContacts, addContact, deleteContact, triggerEmergency } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EmergencyPanel({ sensorData, location, isSeizure }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const PHONE_NUMBER = "6374134569";

  // 1. Fetch contacts only when the user is authenticated
  useEffect(() => {
    if (user?.uid) {
      loadContacts();
    } else {
      // Clear contacts on logout to prevent state leak
      setContacts([]);
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (e) {
      console.error('[Contacts] Load error:', e);
    }
  };

  // 2. Auto-trigger emergency when seizure detected
  const prevSeizure = useRef(false);
  useEffect(() => {
    if (isSeizure && !prevSeizure.current && contacts.length > 0) {
      handleEmergency();
    }
    prevSeizure.current = isSeizure;
  }, [isSeizure, contacts.length]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    try {
      const contact = await addContact(name, phone);
      setContacts(prev => [...prev, contact]);
      setName('');
      setPhone('');
      toast.success(`Contact added: ${name}`);
    } catch (e) {
      toast.error('Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete with Dustbin icon and Confirmation Alert
  const handleDelete = async (id, contactName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${contactName}?`);
    if (confirmDelete) {
      try {
        await deleteContact(id);
        setContacts(prev => prev.filter(c => c.id !== id));
        toast.success('Contact removed');
      } catch (e) {
        toast.error('Failed to remove contact');
      }
    }
  };

  // 4. Native Dialer Logic (Normal Logic)
  const initiateNativeCall = (PHONE_NUMBER) => {
    window.location.href = `tel:${PHONE_NUMBER}`;
  };

  const handleEmergency = async () => {
    if (sending || contacts.length === 0) return;
    setSending(true);

    try {
      // Trigger native call for the first contact
      initiateNativeCall(contacts[0].phone);

      // Trigger Backend SMS (Fast2SMS logic)
      await triggerEmergency(location?.lat, location?.lng, sensorData);

      toast.success('Emergency alert and call initiated!', {
        style: { background: '#1a0010', border: '1px solid var(--red)', color: '#ff3366' }
      });
    } catch (e) {
      toast.error('Dispatch failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🚨</span>
        <span style={styles.headerTitle}>EMERGENCY SYSTEM</span>
      </div>

      <button
        style={{
          ...styles.triggerBtn,
          ...(sending ? styles.triggerBtnLoading : {}),
        }}
        onClick={handleEmergency}
        disabled={sending || contacts.length === 0}
      >
        {sending ? 'DISPATCHING...' : '⚡ TRIGGER EMERGENCY'}
      </button>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>EMERGENCY CONTACTS ({contacts.length})</div>
        <div style={styles.contactList}>
          {contacts.length === 0 && (
            <div style={styles.empty}>No contacts added yet</div>
          )}
          {contacts.map(c => (
            <div key={c.id} style={styles.contactItem}>
              <div style={styles.contactIcon}>👤</div>
              <div style={styles.contactInfo}>
                <div style={styles.contactName}>{c.name}</div>
                <div style={styles.contactPhone}>{c.phone}</div>
              </div>

              <button
                style={styles.callIconBtn}
                onClick={() => initiateNativeCall(c.phone)}
                title="Call Contact"
              >
                📞
              </button>

              <button
                style={styles.deleteBtn}
                onClick={() => handleDelete(c.id, c.name)}
                title="Delete Contact"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      <form style={styles.addForm} onSubmit={handleAdd}>
        <div style={styles.sectionLabel}>ADD EMERGENCY EMAIL</div>
        <input
          style={styles.input}
          type="text"
          placeholder="Contact name (e.g. Doctor)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          style={styles.input}
          type="email" // Changed type to email for browser validation
          placeholder="email@example.com"
          value={phone} // Still using the 'phone' variable name
          onChange={e => setPhone(e.target.value)}
        />
        <button style={styles.addBtn} type="submit" disabled={loading}>
          {loading ? '...' : '+ ADD EMAIL CONTACT'}
        </button>
      </form>


    </div>
  );
}

const styles = {
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottom: '1px solid var(--border)',
  },
  headerIcon: { fontSize: 16 },
  headerTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.1em',
    color: 'var(--red)',
  },
  triggerBtn: {
    width: '100%',
    padding: '11px',
    background: 'linear-gradient(135deg, #660022, #cc0033)',
    border: '1px solid var(--red)',
    borderRadius: 6,
    color: '#fff',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  triggerBtnLoading: { opacity: 0.6, cursor: 'not-allowed' },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
  },
  contactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: 'rgba(0,212,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  },
  contactIcon: { fontSize: 14 },
  contactInfo: { flex: 1 },
  contactName: { fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600 },
  contactPhone: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' },
  callIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--green)',
    padding: '4px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 51, 102, 0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  empty: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: 12 },
  addForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  input: {
    background: 'rgba(0,212,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
  },
  addBtn: {
    padding: '8px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid var(--border-glow)',
    borderRadius: 5,
    color: 'var(--cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    cursor: 'pointer',
    bottom: '40px',
},
  smsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  smsText: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 },
};