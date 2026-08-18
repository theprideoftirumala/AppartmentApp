/**
 * Reminders Page
 * Manage recurring maintenance reminders
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check, Trash2, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getReminders, addReminder, completeReminder, deleteReminder, addAuditLog } from '../services/googleSheets';
import { daysUntil, getRelativeTime, calculateNextDue, getLastDayOfCurrentMonth, getFirstDayOfNextMonth } from '../utils/helpers';
import { REMINDER_FREQUENCIES, DEFAULT_REMINDERS } from '../config/constants';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

export default function Reminders() {
  const { showToast, isOwner } = useApp();
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReminders();
      setReminders(data);
    } catch (err) {
      showToast('Failed to load reminders', 'error');
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
      await addReminder({
        ...formData,
        createdBy: user?.name || user?.email || '',
        nextDue: formData.nextDue || calculateNextDue(null, formData.frequency),
      });
      await addAuditLog(user.email, 'ADD_REMINDER', formData.title);
      showToast('Reminder added', 'success');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to add reminder', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeReminder(id);
      showToast('Marked as completed', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update reminder', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reminder?')) return;
    try {
      await deleteReminder(id);
      showToast('Reminder deleted', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete reminder', 'error');
    }
  };

  const handleAddDefaults = async () => {
    try {
      setSaving(true);
      // Only add reminders that don't already exist (match by title)
      const existingTitles = new Set(reminders.map(r => r.title));
      let added = 0;
      for (const reminder of DEFAULT_REMINDERS) {
        if (existingTitles.has(reminder.title)) continue;
        let nextDue;
        if (reminder.nextDueType === 'end_of_month') nextDue = getLastDayOfCurrentMonth();
        else if (reminder.nextDueType === 'start_of_month') nextDue = getFirstDayOfNextMonth();
        else nextDue = calculateNextDue(null, reminder.frequency);

        await addReminder({
          title: reminder.title,
          description: reminder.description,
          frequency: reminder.frequency,
          assignedTo: reminder.assignedTo || '',
          nextDue,
          createdBy: user?.name || user?.email || '',
        });
        added++;
      }
      showToast(added > 0 ? `${added} default reminder(s) added!` : 'All default reminders already exist.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to add default reminders', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sort reminders: overdue first, then by next due
  const sorted = [...reminders].sort((a, b) => {
    const daysA = daysUntil(a.nextDue);
    const daysB = daysUntil(b.nextDue);
    return daysA - daysB;
  });

  const overdueCount = reminders.filter(r => r.nextDue && daysUntil(r.nextDue) < 0).length;

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Reminders</h1>
          <p className="page-subtitle">
            {overdueCount > 0 && <span className="text-danger">{overdueCount} overdue · </span>}
            {reminders.length} total reminders
          </p>
        </div>
        {isOwner !== false && (
          <div className="flex gap-2">
            {reminders.length === 0 && (
              <button className="btn btn-secondary" onClick={handleAddDefaults} disabled={saving}>
                Add Defaults
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Reminder
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading reminders..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Add reminders for lift maintenance, water tanker booking, and more"
          action={isOwner !== false && (
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={handleAddDefaults}>
                Add Default Reminders
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Custom Reminder
              </button>
            </div>
          )}
        />
      ) : (
        <div className="reminder-grid animate-stagger">
          {sorted.map(reminder => {
            const days = daysUntil(reminder.nextDue);
            const urgency = days < 0 ? 'overdue' : days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'normal';

            return (
              <div key={reminder.id} className={`reminder-card reminder-card-${urgency}`}>
                <div className="reminder-card-header">
                  <div className="reminder-card-urgency">
                    {urgency === 'overdue' && <AlertCircle size={16} />}
                    {urgency === 'urgent' && <Clock size={16} />}
                    {urgency === 'soon' && <Calendar size={16} />}
                    {urgency === 'normal' && <Bell size={16} />}
                    <span>{getRelativeTime(reminder.nextDue)}</span>
                  </div>
                  <span className="badge badge-info">{reminder.frequency}</span>
                </div>

                <h4 className="reminder-card-title">{reminder.title}</h4>
                {reminder.description && (
                  <p className="reminder-card-desc">{reminder.description}</p>
                )}

                <div className="reminder-card-footer">
                  <span className="text-xs text-muted">
                    {reminder.assignedTo && `Assigned: ${reminder.assignedTo}`}
                  </span>
                  {isOwner !== false && (
                    <div className="flex gap-1">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleComplete(reminder.id)}
                        title="Mark completed"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDelete(reminder.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Reminder">
        <AddReminderForm onSave={handleAdd} saving={saving} onClose={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}

function AddReminderForm({ onSave, saving, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'Monthly',
    nextDue: new Date().toISOString().split('T')[0],
    assignedTo: '',
  });

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input type="text" className="form-input" value={formData.title} onChange={e => update('title', e.target.value)} placeholder="e.g., Lift Maintenance Check" required />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={formData.description} onChange={e => update('description', e.target.value)} placeholder="Details about the task" rows={3} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select className="form-select" value={formData.frequency} onChange={e => update('frequency', e.target.value)}>
            {REMINDER_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Next Due Date</label>
          <input type="date" className="form-input" value={formData.nextDue} onChange={e => update('nextDue', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Assigned To</label>
        <input type="text" className="form-input" value={formData.assignedTo} onChange={e => update('assignedTo', e.target.value)} placeholder="Person responsible" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add Reminder'}
        </button>
      </div>
    </form>
  );
}
