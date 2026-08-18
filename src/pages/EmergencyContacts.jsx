/**
 * Emergency Contacts Page
 * Supports call, WhatsApp chat, WhatsApp share, and contact sharing
 */

import { useState, useEffect, useCallback } from 'react';
import { Phone, Plus, Trash2, Search, MessageCircle, Share2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact, addAuditLog } from '../services/googleSheets';
import { EMERGENCY_CATEGORIES } from '../config/constants';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

function cleanPhone(phone) {
  return phone?.replace(/[\s\-+()]/g, '') || '';
}

function waLink(phone) {
  const clean = cleanPhone(phone);
  const intl = clean.startsWith('0') ? '91' + clean.slice(1) : clean.startsWith('91') ? clean : '91' + clean;
  return `https://wa.me/${intl}`;
}

function shareContact(contact) {
  const text = `*${contact.name}*\nCategory: ${contact.category || 'Emergency'}\nPhone: ${contact.phone}${contact.altPhone ? ` / ${contact.altPhone}` : ''}${contact.role ? `\nRole: ${contact.role}` : ''}${contact.notes ? `\nNote: ${contact.notes}` : ''}`;
  if (navigator.share) {
    navigator.share({ title: contact.name, text }).catch(() => { });
  } else {
    const waText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener');
  }
}

export default function EmergencyContacts() {
  const { showToast, isOwner } = useApp();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmergencyContacts();
      setContacts(data);
    } catch (err) {
      showToast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (formData) => {
    try {
      setSaving(true);
      await addEmergencyContact(formData);
      await addAuditLog(user.email, 'ADD_CONTACT', `${formData.name} — ${formData.category}`);
      showToast('Contact added', 'success');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast('Failed to add contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await deleteEmergencyContact(index);
      showToast('Contact deleted', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete contact', 'error');
    }
  };

  const handleShareAll = () => {
    if (!contacts.length) return;
    const text = contacts.map(c =>
      `*${c.name}* (${c.category})\n📞 ${c.phone}${c.altPhone ? ` / ${c.altPhone}` : ''}`
    ).join('\n\n');
    const msg = `*Emergency Contacts — The Pride of Tirumala*\n\n${text}`;
    if (navigator.share) {
      navigator.share({ title: 'Emergency Contacts', text: msg }).catch(() => { });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
  };

  let filtered = contacts;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = contacts.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }

  const grouped = {};
  filtered.forEach((c, i) => {
    const cat = c.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...c, originalIndex: i });
  });

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Emergency Contacts</h1>
          <p className="page-subtitle">{contacts.length} contacts saved</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleShareAll} title="Share all contacts via WhatsApp">
            <MessageCircle size={15} /> Share All
          </button>
          {isOwner !== false && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search contacts by name, category, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading contacts..." />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No contacts saved"
          description="Add emergency contacts for plumber, electrician, medical services, and more"
          action={isOwner !== false && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Contact
            </button>
          )}
        />
      ) : (
        <div className="contacts-grid animate-stagger">
          {Object.entries(grouped).map(([category, categoryContacts]) => (
            <div key={category} className="contacts-category">
              <h4 className="contacts-category-title">{category}</h4>
              <div className="contacts-list">
                {categoryContacts.map((contact, i) => (
                  <div key={i} className="contact-card">
                    <div className="contact-info">
                      <div className="contact-name">{contact.name}</div>
                      {contact.role && <div className="contact-role text-muted text-xs">{contact.role}</div>}
                      <a href={`tel:${contact.phone}`} className="contact-phone">
                        <Phone size={13} /> {contact.phone}
                      </a>
                      {contact.altPhone && (
                        <a href={`tel:${contact.altPhone}`} className="contact-phone text-muted">
                          <Phone size={13} /> {contact.altPhone}
                        </a>
                      )}
                      {contact.notes && <p className="contact-notes text-xs text-muted mt-1">{contact.notes}</p>}
                    </div>
                    <div className="contact-actions">
                      <a
                        href={`tel:${contact.phone}`}
                        className="btn btn-success btn-sm btn-icon"
                        title={`Call ${contact.name}`}
                      >
                        <Phone size={15} />
                      </a>
                      <a
                        href={waLink(contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-whatsapp btn-sm btn-icon"
                        title={`WhatsApp ${contact.name}`}
                      >
                        <MessageCircle size={15} />
                      </a>
                      <button
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => shareContact(contact)}
                        title="Share contact"
                      >
                        <Share2 size={15} />
                      </button>
                      {isOwner !== false && (
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-danger"
                          onClick={() => handleDelete(contact.originalIndex)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Emergency Contact">
        <AddContactForm onSave={handleAdd} saving={saving} onClose={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}

function AddContactForm({ onSave, saving, onClose }) {
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    role: '',
    phone: '',
    altPhone: '',
    address: '',
    notes: '',
  });

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-select" value={formData.category} onChange={e => update('category', e.target.value)} required>
            <option value="">Select category</option>
            {EMERGENCY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input type="text" className="form-input" value={formData.name} onChange={e => update('name', e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Role / Designation</label>
        <input type="text" className="form-input" value={formData.role} onChange={e => update('role', e.target.value)} placeholder="e.g., Main Plumber" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input type="tel" className="form-input" value={formData.phone} onChange={e => update('phone', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Alternate Phone</label>
          <input type="tel" className="form-input" value={formData.altPhone} onChange={e => update('altPhone', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Address</label>
        <input type="text" className="form-input" value={formData.address} onChange={e => update('address', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={formData.notes} onChange={e => update('notes', e.target.value)} rows={2} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}
