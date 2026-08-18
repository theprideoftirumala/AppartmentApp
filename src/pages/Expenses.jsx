/**
 * Expenses Page
 * Log, view, and manage all apartment expenses
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Trash2, ExternalLink, Receipt } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getExpenses, addExpense, deleteExpense, addAuditLog } from '../services/googleSheets';
import { uploadReceipt } from '../services/googleDrive';
import { formatCurrency, formatDate, getCurrentMonthLabel, getCurrentYearMonth, getFiscalMonthOptions } from '../utils/helpers';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../config/constants';
import Modal from '../components/common/Modal';
import FileUpload from '../components/common/FileUpload';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Navbar from '../components/common/Navbar';

export default function Expenses() {
  const { showToast, isOwner } = useApp();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const monthOptions = getFiscalMonthOptions();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddExpense = async (formData, files) => {
    try {
      setSaving(true);

      // Duplicate check: same description + amount + date
      const duplicate = expenses.find(e =>
        e.description?.toLowerCase().trim() === formData.description?.toLowerCase().trim() &&
        Number(e.amount) === Number(formData.amount) &&
        e.date === formData.date
      );
      if (duplicate) {
        showToast(`Duplicate detected: "${formData.description}" for ₹${formData.amount} on ${formData.date} already exists.`, 'error');
        setSaving(false);
        return;
      }

      let receiptLink = '';

      // Upload receipt if provided
      if (files && files.length > 0) {
        const yearMonth = getCurrentYearMonth();
        const uploadResult = await uploadReceipt(files[0], yearMonth);
        receiptLink = uploadResult.webViewLink || '';
      }

      await addExpense({
        ...formData,
        billReceipt: files?.length > 0 ? 'Y' : 'N',
        receiptLink,
        approvedBy: user?.name || user?.email || '',
      });

      await addAuditLog(user.email, 'ADD_EXPENSE', `${formData.description}: ₹${formData.amount}`);
      showToast('Expense added successfully', 'success');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast('Failed to add expense', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(expenseId);
      await addAuditLog(user.email, 'DELETE_EXPENSE', `Deleted expense ${expenseId}`);
      showToast('Expense deleted', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  // Filter expenses
  let filtered = [...expenses];
  if (filterMonth) filtered = filtered.filter(e => e.month === filterMonth);
  if (filterCategory) filtered = filtered.filter(e => e.category === filterCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.remarks?.toLowerCase().includes(q)
    );
  }

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track all apartment expenses</p>
        </div>
        {isOwner !== false && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Expense
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="expense-filters card">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ width: 130 }}
          >
            <option value="">All Months</option>
            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            className="form-select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="expense-total-badge">
            Total: <strong>{formatCurrency(totalAmount)}</strong> ({filtered.length} items)
          </div>
        </div>
      </div>

      {/* Expense List */}
      {loading ? (
        <LoadingSpinner text="Loading expenses..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description={searchQuery || filterMonth || filterCategory ? 'Try adjusting your filters' : 'Start by adding your first expense'}
          action={isOwner !== false && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Expense
            </button>
          )}
        />
      ) : (
        <div className="table-container mt-4 animate-fade-in-up">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Month</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map(expense => (
                  <tr key={expense.id}>
                    <td className="text-muted">{formatDate(expense.date)}</td>
                    <td className="font-medium">{expense.description}</td>
                    <td><span className="badge badge-primary">{expense.category}</span></td>
                    <td className="font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                    <td>{expense.paymentMode}</td>
                    <td>{expense.month}</td>
                    <td>
                      {expense.receiptLink ? (
                        <a href={expense.receiptLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                          <ExternalLink size={14} /> View
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {isOwner !== false && (
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(expense.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddExpense}
        saving={saving}
      />
    </div>
  );
}

function AddExpenseModal({ isOpen, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    month: getCurrentMonthLabel(),
    description: '',
    category: '',
    amount: '',
    paymentMode: 'UPI',
    remarks: '',
  });
  const [files, setFiles] = useState([]);
  const monthOptions = getFiscalMonthOptions();

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category) return;
    onSave({ ...formData, amount: Number(formData.amount) }, files);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense" size="lg">
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={formData.date} onChange={e => update('date', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={formData.month} onChange={e => update('month', e.target.value)}>
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <input type="text" className="form-input" value={formData.description} onChange={e => update('description', e.target.value)} placeholder="What was the payment for?" required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={formData.category} onChange={e => update('category', e.target.value)} required>
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input type="number" className="form-input" value={formData.amount} onChange={e => update('amount', e.target.value)} placeholder="0" min="1" required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-select" value={formData.paymentMode} onChange={e => update('paymentMode', e.target.value)}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input type="text" className="form-input" value={formData.remarks} onChange={e => update('remarks', e.target.value)} placeholder="Vendor name, notes..." />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Receipt / Bill</label>
          <FileUpload onFileSelect={setFiles} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
