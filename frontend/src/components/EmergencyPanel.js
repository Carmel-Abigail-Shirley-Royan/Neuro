import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { triggerEmergency } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EmergencyPanel({ sensorData, location, isSeizure }) {

  const { user } = useAuth();

  // Load contacts from browser storage
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem("contacts");
    return saved ? JSON.parse(saved) : [];
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const PHONE_NUMBER = "6374134569";

  // Detect seizure and auto trigger emergency
  const prevSeizure = useRef(false);

  useEffect(() => {

    if (isSeizure && !prevSeizure.current) {
      handleEmergency();
    }

    prevSeizure.current = isSeizure;

  }, [isSeizure]);



  // Add contact
  const handleAdd = (e) => {

    e.preventDefault();

    if (!name || !email) return;

    const newContact = {
      id: Date.now(),
      name: name,
      email: email
    };

    const updatedContacts = [...contacts, newContact];

    setContacts(updatedContacts);

    localStorage.setItem("contacts", JSON.stringify(updatedContacts));

    setName('');
    setEmail('');

    toast.success(`Contact added: ${name}`);
  };



  // Delete contact
  const handleDelete = (id, contactName) => {

    if (!window.confirm(`Delete ${contactName}?`)) return;

    const updated = contacts.filter(c => c.id !== id);

    setContacts(updated);

    localStorage.setItem("contacts", JSON.stringify(updated));

    toast.success("Contact removed");

  };



  // Call hardcoded emergency number
  const initiateNativeCall = () => {

    window.location.href = `tel:${PHONE_NUMBER}`;

  };



  // Emergency trigger
  const handleEmergency = async () => {

    if (sending) return;

    setSending(true);

    try {

      // Call emergency number
      initiateNativeCall();

      // Send backend emergency alert
      await triggerEmergency(location?.lat, location?.lng, sensorData);

      toast.success("Emergency alert and call initiated!", {
        style: {
          background: '#1a0010',
          border: '1px solid var(--red)',
          color: '#ff3366'
        }
      });

    } catch (e) {

      toast.error(
        "Dispatch failed: " + (e.response?.data?.detail || e.message)
      );

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
          ...(sending ? styles.triggerBtnLoading : {})
        }}
        onClick={handleEmergency}
        disabled={sending}
      >
        {sending ? "DISPATCHING..." : "⚡ TRIGGER EMERGENCY"}
      </button>



      <div style={styles.section}>

        <div style={styles.sectionLabel}>
          EMERGENCY CONTACTS ({contacts.length})
        </div>

        <div style={styles.contactList}>

          {contacts.length === 0 && (
            <div style={styles.empty}>No contacts added yet</div>
          )}

          {contacts.map(c => (

            <div key={c.id} style={styles.contactItem}>

              <div style={styles.contactIcon}>👤</div>

              <div style={styles.contactInfo}>
                <div style={styles.contactName}>{c.name}</div>
                <div style={styles.contactPhone}>{c.email}</div>
              </div>

              <button
                style={styles.callIconBtn}
                onClick={initiateNativeCall}
                title="Call Emergency"
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
          placeholder="Contact name (Doctor / Family)"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          style={styles.input}
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <button style={styles.addBtn} type="submit">
          + ADD EMAIL CONTACT
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
    overflowY: 'auto'
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottom: '1px solid var(--border)'
  },

  headerIcon: { fontSize: 16 },

  headerTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.1em',
    color: 'var(--red)'
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
    cursor: 'pointer'
  },

  triggerBtnLoading: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em'
  },

  contactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto'
  },

  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: 'rgba(0,212,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 6
  },

  contactIcon: { fontSize: 14 },

  contactInfo: { flex: 1 },

  contactName: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600
  },

  contactPhone: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)'
  },

  callIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--green)'
  },

  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,51,102,0.7)',
    cursor: 'pointer',
    fontSize: '14px'
  },

  empty: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: 12
  },

  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  input: {
    background: 'rgba(0,212,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none'
  },

  addBtn: {
    padding: '8px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid var(--border-glow)',
    borderRadius: 5,
    color: 'var(--cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    cursor: 'pointer'
  }

};