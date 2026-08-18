/**
 * Settings Page
 * Configuration, access control, backups, and app management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Users, Shield, Database, Trash2,
  Plus, ExternalLink, Download, UserPlus, UserMinus, Save,
  RefreshCw, AlertTriangle, Key, Eye, Lock
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getConfiguration, updateConfiguration,
  getAccessControl, addAccessControl, removeAccessControl,
  getFlats, updateFlat, addAuditLog,
  getWatchmanDetails, addWatchmanDetail, updateWatchmanDetail, deleteWatchmanDetail
} from '../services/googleSheets';
import {
  createBackup, listBackups,
  getSpreadsheetUrl, getRootFolderUrl,
  shareSpreadsheet, shareFolder
} from '../services/googleDrive';
import { DEFAULT_CONFIG, FLATS, USER_ROLES } from '../config/constants';
import { formatDate, formatCurrency, isValidEmail } from '../utils/helpers';
import { InfoBubble } from '../components/common/Tooltip';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Navbar from '../components/common/Navbar';

export default function Settings() {
  const { showToast, isOwner, resetSetup, userRole } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('config');
  const [config, setConfig] = useState({});
  const [accessList, setAccessList] = useState([]);
  const [flatsList, setFlatsList] = useState([]);
  const [backups, setBackups] = useState([]);
  const [watchmanList, setWatchmanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditFlat, setShowEditFlat] = useState(null);
  const [showWatchmanModal, setShowWatchmanModal] = useState(false);
  const [editingWatchman, setEditingWatchman] = useState(null);
  const [backingUp, setBackingUp] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [configData, access, flats, backupList, watchmanData] = await Promise.all([
        getConfiguration(),
        getAccessControl(),
        getFlats(),
        listBackups().catch(() => []),
        getWatchmanDetails().catch(() => []),
      ]);
      setConfig(configData);
      setAccessList(access);
      setFlatsList(flats);
      setBackups(backupList);
      setWatchmanList(watchmanData.filter(w => w.status !== 'Deleted'));
    } catch (err) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Configuration ──────────────────────────────────
  const handleSaveConfig = async (key, value) => {
    try {
      setSaving(true);
      await updateConfiguration(key, value);
      await addAuditLog(user.email, 'UPDATE_CONFIG', `${key} = ${value}`);
      setConfig(prev => ({ ...prev, [key]: value }));
      showToast('Configuration updated', 'success');
    } catch (err) {
      showToast('Failed to update configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Access Control ──────────────────────────────────
  const handleAddUser = async (email, role, flat) => {
    try {
      setSaving(true);
      await addAccessControl({
        email,
        role,
        flat,
        addedBy: user.email,
      });

      // Share Google resources
      const driveRole = role === 'Owner' ? 'writer' : 'reader';
      await shareSpreadsheet(email, driveRole);
      await shareFolder(email, driveRole);

      await addAuditLog(user.email, 'ADD_USER', `${email} as ${role}`);
      showToast(`Added ${email} as ${role}`, 'success');
      setShowAddUser(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to add user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (email) => {
    if (!confirm(`Remove access for ${email}?`)) return;
    try {
      await removeAccessControl(email);
      await addAuditLog(user.email, 'REMOVE_USER', email);
      showToast(`Removed ${email}`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to remove user', 'error');
    }
  };

  // ── Flat Management ──────────────────────────────────
  const handleSaveFlat = async (flatNumber, data) => {
    try {
      setSaving(true);
      await updateFlat(flatNumber, data);
      await addAuditLog(user.email, 'UPDATE_FLAT', `Flat ${flatNumber}`);
      showToast(`Flat ${flatNumber} updated`, 'success');
      setShowEditFlat(null);
      fetchData();
    } catch (err) {
      showToast('Failed to update flat', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Backups ──────────────────────────────────
  const handleBackup = async () => {
    try {
      setBackingUp(true);
      const result = await createBackup();
      await addAuditLog(user.email, 'BACKUP', result.name);
      showToast(`Backup created: ${result.name}`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to create backup', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  // ── Watchman ──────────────────────────────────
  const handleSaveWatchman = async (data) => {
    try {
      setSaving(true);
      if (editingWatchman !== null && editingWatchman.index !== undefined) {
        await updateWatchmanDetail(editingWatchman.index, data);
        await addAuditLog(user.email, 'UPDATE_WATCHMAN', `Updated: ${data.name}`);
        showToast('Watchman details updated', 'success');
      } else {
        await addWatchmanDetail(data);
        await addAuditLog(user.email, 'ADD_WATCHMAN', `Added: ${data.name}`);
        showToast('Watchman added', 'success');
      }
      setShowWatchmanModal(false);
      setEditingWatchman(null);
      fetchData();
    } catch (err) {
      showToast('Failed to save watchman', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWatchman = async (index) => {
    if (!confirm('Remove this watchman record?')) return;
    try {
      await deleteWatchmanDetail(index);
      await addAuditLog(user.email, 'DELETE_WATCHMAN', `Removed watchman at row ${index}`);
      showToast('Watchman removed', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to remove watchman', 'error');
    }
  };

  const tabs = [
    { id: 'config', label: 'Configuration', icon: SettingsIcon },
    { id: 'flats', label: 'Flat Details', icon: Shield },
    { id: 'watchman', label: 'Watchman', icon: Eye },
    { id: 'access', label: 'Access Control', icon: Users },
    { id: 'backups', label: 'Backups', icon: Database },
  ];

  if (loading) {
    return (
      <div className="main-content">
        <Navbar />
        <LoadingSpinner text="Loading settings..." />
      </div>
    );
  }

  const sheetUrl = getSpreadsheetUrl();
  const driveUrl = getRootFolderUrl();

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage configuration, users, and backups</p>
        </div>
        <div className="flex gap-2">
          {sheetUrl && (
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={14} /> Open Sheet
            </a>
          )}
          {driveUrl && (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={14} /> Open Drive
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="settings-content animate-fade-in">
        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="card">
            <h3 className="card-title mb-4">Apartment Configuration</h3>
            <p className="text-muted text-sm mb-6">
              These values are stored in the <strong>Configuration</strong> sheet in Google Drive and control the app behaviour.
              {userRole !== 'Owner' && ' (Read-only for your role)'}
            </p>

            <div className="settings-grid">
              {[
                {
                  key: 'APARTMENT_NAME', label: 'Apartment Name', type: 'text',
                  info: 'Name displayed on reports and the dashboard header.'
                },
                {
                  key: 'MONTHLY_MAINTENANCE', label: 'Monthly Maintenance (₹)', type: 'number',
                  info: 'Fixed amount every flat pays per month. Currently ₹3,000 per flat × 10 flats = ₹30,000 expected per month.'
                },
                {
                  key: 'CORPUS_FUND', label: 'Corpus Fund (₹)', type: 'number', readonly: true,
                  info: 'One-time corpus amount collected from flat owners. Edit directly in the Configuration sheet in Google Drive.'
                },
                {
                  key: 'DEFICIT_LAST_YEAR', label: 'Deficit from August 2026 (Handover) ₹', type: 'number', readonly: true,
                  info: 'Opening balance/deficit as on 31 Aug 2026 (handover). To change this value, update DEFAULT_CONFIG.DEFICIT_LAST_YEAR in src/config/constants.js and the DEFICIT_LAST_YEAR row in the Configuration sheet.'
                },
                {
                  key: 'FISCAL_YEAR_START', label: 'Fiscal Year Start (YYYY-MM)', type: 'text',
                  info: 'Start month of the financial year. For TPT this is 2026-09 (September 2026).'
                },
                {
                  key: 'TREASURER_FLAT', label: 'Treasurer Flat', type: 'select', options: FLATS,
                  info: 'Flat number of the current Treasurer. Shown on PDF reports and footer.'
                },
                {
                  key: 'PRESIDENT_FLAT', label: 'President Flat', type: 'select', options: FLATS,
                  info: 'Flat number of the current President. Shown on PDF reports and footer.'
                },
              ].map(field => (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onSave={(value) => handleSaveConfig(field.key, value)}
                  disabled={isOwner === false || field.readonly}
                />
              ))}
            </div>

            <div className="config-note mt-6">
              <AlertTriangle size={16} />
              <p>
                <strong>Corpus Fund</strong> and <strong>Deficit from August 2026 (Handover)</strong> are read-only here.
                Edit them directly in the <em>Configuration</em> sheet in Google Drive, or update <code>DEFAULT_CONFIG</code> in
                <code>src/config/constants.js</code> before initial setup.
              </p>
            </div>
          </div>
        )}

        {/* Flats Tab */}
        {activeTab === 'flats' && (
          <div className="card">
            <h3 className="card-title mb-4">Flat Owner Details</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Owner Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Member 2</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flatsList.map(flat => (
                    <tr key={flat.flat}>
                      <td className="font-semibold">{flat.flat}</td>
                      <td>{flat.ownerName || <span className="text-muted">Not set</span>}</td>
                      <td>{flat.phone || '-'}</td>
                      <td className="text-sm">{flat.email || '-'}</td>
                      <td>{flat.member2Name || '-'}</td>
                      <td>
                        <span className={`badge ${flat.role === 'Member' ? 'badge-info' : 'badge-primary'}`}>
                          {flat.flat === String(config.TREASURER_FLAT) ? 'Treasurer' :
                            flat.flat === String(config.PRESIDENT_FLAT) ? 'President' : flat.role}
                        </span>
                      </td>
                      <td>
                        {isOwner !== false && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setShowEditFlat(flat)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Access Control Tab */}
        {activeTab === 'access' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Access Control</h3>
              {isOwner !== false && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(true)}>
                  <UserPlus size={14} /> Add User
                </button>
              )}
            </div>
            <p className="text-muted text-sm mb-4">
              Max {config.MAX_USERS || 20} users, max {config.MAX_OWNERS || 2} owners. Only owners can add/remove users.
            </p>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Flat</th>
                    <th>Added By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessList.map((entry, i) => (
                    <tr key={i}>
                      <td className="font-medium">{entry.email}</td>
                      <td>
                        <span className={`badge ${entry.role === 'Owner' ? 'badge-warning' : 'badge-info'}`}>
                          {entry.role}
                        </span>
                      </td>
                      <td>{entry.flat || '-'}</td>
                      <td className="text-muted">{entry.addedBy}</td>
                      <td className="text-muted">{entry.addedDate}</td>
                      <td>
                        <span className={`badge ${entry.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td>
                        {isOwner !== false && entry.email !== user.email && entry.status === 'Active' && (
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemoveUser(entry.email)}>
                            <UserMinus size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Backups</h3>
              {isOwner !== false && (
                <button className="btn btn-primary btn-sm" onClick={handleBackup} disabled={backingUp}>
                  {backingUp ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {backingUp ? 'Creating...' : 'Create Backup'}
                </button>
              )}
            </div>
            <p className="text-muted text-sm mb-4">
              Backups are copies of the spreadsheet saved to the backups folder in Google Drive.
            </p>

            {backups.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map(backup => (
                      <tr key={backup.id}>
                        <td className="font-medium">{backup.name}</td>
                        <td className="text-muted">{formatDate(backup.createdTime)}</td>
                        <td>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${backup.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                          >
                            <ExternalLink size={14} /> Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>
                No backups yet. Create your first backup to safeguard your data.
              </p>
            )}
          </div>
        )}

        {/* Watchman Tab */}
        {activeTab === 'watchman' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Watchman Details</h3>
              {isOwner !== false && (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingWatchman(null); setShowWatchmanModal(true); }}>
                  <Plus size={14} /> Add Watchman
                </button>
              )}
            </div>
            <p className="text-muted text-sm mb-4">
              Manage watchman/security guard details. This information is included in monthly PDF reports.
            </p>

            {watchmanList.length > 0 ? (
              <div className="watchman-grid">
                {watchmanList.map((w, i) => (
                  <div key={i} className="watchman-card">
                    <div className="watchman-card-header">
                      <div className="watchman-avatar">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h4 className="watchman-name">{w.name || 'Unnamed'}</h4>
                        <span className={`badge ${w.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{w.status}</span>
                      </div>
                    </div>
                    <div className="watchman-details-grid">
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">Phone</span>
                        <a href={`tel:${w.phone}`} className="watchman-detail-value text-success">{w.phone || '-'}</a>
                      </div>
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">Shift</span>
                        <span className="watchman-detail-value">{w.shiftTiming || '-'}</span>
                      </div>
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">Salary</span>
                        <span className="watchman-detail-value font-semibold">{formatCurrency(w.salary)}</span>
                      </div>
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">Join Date</span>
                        <span className="watchman-detail-value">{w.joinDate || '-'}</span>
                      </div>
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">ID Proof</span>
                        <span className="watchman-detail-value">{w.idProofType ? `${w.idProofType}: ${w.idProofNumber}` : '-'}</span>
                      </div>
                      <div className="watchman-detail">
                        <span className="watchman-detail-label">Emergency</span>
                        <span className="watchman-detail-value">{w.emergencyContact ? `${w.emergencyContact} (${w.emergencyPhone})` : '-'}</span>
                      </div>
                    </div>
                    {w.address && <p className="text-muted text-xs mt-2">Address: {w.address}</p>}
                    {w.remarks && <p className="text-muted text-xs mt-1">Note: {w.remarks}</p>}
                    {isOwner !== false && (
                      <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWatchman(w); setShowWatchmanModal(true); }}>Edit</button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteWatchman(w.index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center" style={{ padding: '2rem 0' }}>
                No watchman details added yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSave={handleAddUser}
        saving={saving}
        accessList={accessList}
        config={config}
      />

      {/* Edit Flat Modal */}
      {showEditFlat && (
        <EditFlatModal
          isOpen={!!showEditFlat}
          onClose={() => setShowEditFlat(null)}
          onSave={handleSaveFlat}
          flat={showEditFlat}
          saving={saving}
        />
      )}

      {/* Watchman Modal */}
      <WatchmanModal
        isOpen={showWatchmanModal}
        onClose={() => { setShowWatchmanModal(false); setEditingWatchman(null); }}
        onSave={handleSaveWatchman}
        watchman={editingWatchman}
        saving={saving}
      />
    </div>
  );
}

function ConfigField({ field, value, onSave, disabled }) {
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditValue(String(value ?? ''));
  }, [value]);

  const handleSave = () => {
    const finalValue = field.type === 'number' ? Number(editValue) : editValue;
    onSave(finalValue);
    setEditing(false);
  };

  const isReadonly = disabled || field.readonly;

  return (
    <div className="config-field">
      <label className="config-field-label">
        {field.label}
        {field.readonly && <Lock size={12} style={{ marginLeft: 4, opacity: 0.5 }} title="Read-only" />}
        {field.info && <InfoBubble text={field.info} />}
      </label>
      <div className="config-field-input">
        {field.type === 'select' ? (
          <select
            className="form-select"
            value={editValue}
            onChange={e => { setEditValue(e.target.value); setEditing(true); }}
            disabled={isReadonly}
          >
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={field.type}
            className={`form-input ${isReadonly ? 'input-readonly' : ''}`}
            value={editValue}
            onChange={e => { setEditValue(e.target.value); setEditing(true); }}
            disabled={isReadonly}
            readOnly={isReadonly}
          />
        )}
        {editing && !isReadonly && (
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Save size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function AddUserModal({ isOpen, onClose, onSave, saving, accessList, config }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Reader');
  const [flat, setFlat] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    onSave(email, role, flat);
  };

  const activeOwners = accessList.filter(a => a.role === 'Owner' && a.status === 'Active').length;
  const maxOwnerReached = activeOwners >= (config.MAX_OWNERS || 2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add User">
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="Reader">Reader (View Only)</option>
              <option value="Owner" disabled={maxOwnerReached}>
                Owner (Full Access) {maxOwnerReached ? '— Max reached' : ''}
              </option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Flat (Optional)</label>
            <select className="form-select" value={flat} onChange={e => setFlat(e.target.value)}>
              <option value="">Not assigned</option>
              {FLATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditFlatModal({ isOpen, onClose, onSave, flat, saving }) {
  const [formData, setFormData] = useState({ ...flat });

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(flat.flat, formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Flat ${flat.flat}`}>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Owner Name</label>
            <input type="text" className="form-input" value={formData.ownerName} onChange={e => update('ownerName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-input" value={formData.phone} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={formData.email} onChange={e => update('email', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Member 2 Name</label>
            <input type="text" className="form-input" value={formData.member2Name} onChange={e => update('member2Name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Member 2 Phone</label>
            <input type="tel" className="form-input" value={formData.member2Phone} onChange={e => update('member2Phone', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Member 2 Email</label>
          <input type="email" className="form-input" value={formData.member2Email} onChange={e => update('member2Email', e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function WatchmanModal({ isOpen, onClose, onSave, watchman, saving }) {
  const [formData, setFormData] = useState({
    name: '', phone: '', altPhone: '', address: '', salary: 0,
    shiftTiming: 'Night (8PM - 8AM)', joinDate: '', idProofType: 'Aadhaar',
    idProofNumber: '', emergencyContact: '', emergencyPhone: '',
    photoDriveLink: '', status: 'Active', remarks: '',
  });

  useEffect(() => {
    if (watchman) {
      setFormData({
        name: watchman.name || '',
        phone: watchman.phone || '',
        altPhone: watchman.altPhone || '',
        address: watchman.address || '',
        salary: watchman.salary || 0,
        shiftTiming: watchman.shiftTiming || 'Night (8PM - 8AM)',
        joinDate: watchman.joinDate || '',
        idProofType: watchman.idProofType || 'Aadhaar',
        idProofNumber: watchman.idProofNumber || '',
        emergencyContact: watchman.emergencyContact || '',
        emergencyPhone: watchman.emergencyPhone || '',
        photoDriveLink: watchman.photoDriveLink || '',
        status: watchman.status || 'Active',
        remarks: watchman.remarks || '',
      });
    } else {
      setFormData({
        name: '', phone: '', altPhone: '', address: '', salary: 0,
        shiftTiming: 'Night (8PM - 8AM)', joinDate: new Date().toISOString().split('T')[0],
        idProofType: 'Aadhaar', idProofNumber: '', emergencyContact: '',
        emergencyPhone: '', photoDriveLink: '', status: 'Active', remarks: '',
      });
    }
  }, [watchman, isOpen]);

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={watchman ? 'Edit Watchman' : 'Add Watchman'} size="lg">
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input type="text" className="form-input" value={formData.name} onChange={e => update('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input type="tel" className="form-input" value={formData.phone} onChange={e => update('phone', e.target.value)} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Alt. Phone</label>
            <input type="tel" className="form-input" value={formData.altPhone} onChange={e => update('altPhone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Salary (₹/month)</label>
            <input type="number" className="form-input" value={formData.salary} onChange={e => update('salary', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Shift Timing</label>
            <select className="form-select" value={formData.shiftTiming} onChange={e => update('shiftTiming', e.target.value)}>
              <option>Night (8PM - 8AM)</option>
              <option>Day (8AM - 8PM)</option>
              <option>Full Day (24 hours)</option>
              <option>Morning (6AM - 2PM)</option>
              <option>Evening (2PM - 10PM)</option>
              <option>Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Join Date</label>
            <input type="date" className="form-input" value={formData.joinDate} onChange={e => update('joinDate', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input type="text" className="form-input" value={formData.address} onChange={e => update('address', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">ID Proof Type</label>
            <select className="form-select" value={formData.idProofType} onChange={e => update('idProofType', e.target.value)}>
              <option>Aadhaar</option>
              <option>PAN</option>
              <option>Voter ID</option>
              <option>Driving License</option>
              <option>Passport</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ID Number</label>
            <input type="text" className="form-input" value={formData.idProofNumber} onChange={e => update('idProofNumber', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Emergency Contact Name</label>
            <input type="text" className="form-input" value={formData.emergencyContact} onChange={e => update('emergencyContact', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Emergency Phone</label>
            <input type="tel" className="form-input" value={formData.emergencyPhone} onChange={e => update('emergencyPhone', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status} onChange={e => update('status', e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Resigned</option>
              <option>Terminated</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input type="text" className="form-input" value={formData.remarks} onChange={e => update('remarks', e.target.value)} placeholder="Any notes..." />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : watchman ? 'Update' : 'Add Watchman'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
