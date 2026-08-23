/**
 * Expenses Page
 * Log, view, and manage all apartment expenses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Trash2, ExternalLink, Receipt, Mic, Square, Camera } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getExpenses, addExpenses, deleteExpense, addAuditLog } from '../services/googleSheets';
import { uploadReceipt } from '../services/googleDrive';
import { formatCurrency, formatDate, getCurrentMonthLabel, getCurrentYearMonth, getFiscalMonthOptions } from '../utils/helpers';
import { EXPENSE_CATEGORIES, PAYMENT_MODES, FEATURES } from '../config/constants';
import { createSpeechRecognizer, parseExpensesFromSpeech, speechSupported } from '../utils/voiceExpense';
import { parseReceiptText, recognizeReceiptImage } from '../utils/receiptOcr';
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

  const handleAddExpenses = async (batch, files) => {
    try {
      setSaving(true);

      for (const line of batch.lines) {
        const duplicate = expenses.find((e) =>
          e.description?.toLowerCase().trim() === line.description?.toLowerCase().trim()
          && Number(e.amount) === Number(line.amount)
          && e.date === batch.date
        );
        if (duplicate) {
          showToast(`Duplicate: "${line.description}" for ₹${line.amount} on ${batch.date} already exists.`, 'error');
          setSaving(false);
          return;
        }
      }

      let receiptLink = '';
      if (files && files.length > 0) {
        const yearMonth = getCurrentYearMonth();
        const uploadResult = await uploadReceipt(files[0], yearMonth);
        receiptLink = uploadResult.webViewLink || '';
      }

      const items = batch.lines.map((line) => ({
        date: batch.date,
        month: batch.month,
        description: line.description,
        category: line.category,
        amount: Number(line.amount),
        paymentMode: line.paymentMode,
        remarks: line.remarks,
        billReceipt: files?.length > 0 ? 'Y' : 'N',
        receiptLink,
        approvedBy: user?.name || user?.email || '',
      }));

      await addExpenses(items);
      const summary = items.map((i) => `${i.description}: ₹${i.amount}`).join('; ');
      await addAuditLog(user.email, 'ADD_EXPENSE', `${items.length} expense(s): ${summary}`);
      showToast(items.length === 1 ? 'Expense added' : `${items.length} expenses added`, 'success');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to add expenses', 'error');
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
          <p className="page-subtitle">Log one bill or several in the same sitting</p>
        </div>
        {isOwner !== false && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add expenses
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
              <Plus size={16} /> Add expenses
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
        onSave={handleAddExpenses}
        saving={saving}
      />
    </div>
  );
}

function emptyExpenseLine() {
  return { description: '', category: '', amount: '', paymentMode: 'UPI', remarks: '' };
}

function AddExpenseModal({ isOpen, onClose, onSave, saving }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(getCurrentMonthLabel());
  const [lines, setLines] = useState([emptyExpenseLine()]);
  const [files, setFiles] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef(null);
  const recognizerRef = useRef(null);
  const monthOptions = getFiscalMonthOptions();
  const canVoice = FEATURES.VOICE_EXPENSES && speechSupported();
  const canCamera = FEATURES.CAMERA_EXPENSES;

  useEffect(() => {
    if (!isOpen) return;
    setDate(new Date().toISOString().split('T')[0]);
    setMonth(getCurrentMonthLabel());
    setLines([emptyExpenseLine()]);
    setFiles([]);
    setListening(false);
    setVoiceHint('');
    setScanning(false);
  }, [isOpen]);

  const handleVoice = () => {
    if (listening && recognizerRef.current) {
      recognizerRef.current.stop();
      return;
    }
    const rec = createSpeechRecognizer();
    if (!rec) {
      setVoiceHint('Voice is not available in this browser. Use Chrome or Safari.');
      return;
    }
    recognizerRef.current = rec;
    rec.onresult = (event) => {
      const said = event.results?.[0]?.[0]?.transcript || '';
      const parsed = parseExpensesFromSpeech(said, EXPENSE_CATEGORIES);
      if (parsed.length) {
        setLines(parsed);
        setVoiceHint(`Heard: “${said}”. Check the lines below, then save.`);
      } else {
        setVoiceHint(`Heard: “${said}”. Could not fill the form — type the details.`);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceHint('Could not hear that. Please try again or type the expense.');
    };
    rec.onend = () => setListening(false);
    setListening(true);
    setVoiceHint('Listening… say amount, what it is for, and category. Example: watchman salary 12000 and electricity 2400.');
    rec.start();
  };

  const handleReceiptScan = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFiles([file]);
    setScanning(true);
    setVoiceHint('Reading the receipt on this device. Nothing is uploaded for OCR.');
    try {
      const text = await recognizeReceiptImage(file);
      const parsed = parseReceiptText(text, EXPENSE_CATEGORIES);
      if (parsed.amount || parsed.description) {
        setLines([parsed]);
        if (parsed.date) setDate(parsed.date);
        setVoiceHint('Filled from the photo. Check every field, then save.');
      } else {
        setVoiceHint('Could not read amounts from the photo. Type the details and keep the picture attached.');
      }
    } catch {
      setVoiceHint('Could not read the photo. Type the expense and keep the picture attached.');
    } finally {
      setScanning(false);
    }
  };

  const updateLine = (index, key, value) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  const addLine = () => {
    if (lines.length >= 25) return;
    setLines((prev) => [...prev, emptyExpenseLine()]);
  };

  const removeLine = (index) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const lineTotal = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = lines.filter((line) => line.description.trim() && line.category && Number(line.amount) > 0);
    if (valid.length === 0) return;
    onSave({ date, month, lines: valid }, files);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add expenses" size="lg">
      <form onSubmit={handleSubmit} className="form-grid">
        <p className="text-muted text-sm">
          Same date and month for this batch. Add as many lines as you need. One optional receipt is attached to every line.
        </p>
        {(canVoice || canCamera) && (
          <div className="voice-expense-bar">
            {canVoice && (
              <button type="button" className={`btn ${listening ? 'btn-danger' : 'btn-secondary'}`} onClick={handleVoice}>
                {listening ? <Square size={16} /> : <Mic size={16} />}
                {listening ? 'Listening…' : 'Fill with voice'}
              </button>
            )}
            {canCamera && (
              <button type="button" className="btn btn-secondary" disabled={scanning} onClick={() => cameraRef.current?.click()}>
                <Camera size={16} />
                {scanning ? 'Reading photo…' : 'Fill from camera'}
              </button>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleReceiptScan}
            />
            {voiceHint && <p className="text-sm text-muted">{voiceHint}</p>}
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {lines.map((line, index) => (
          <div className="expense-line-card" key={index}>
            <div className="expense-line-head">
              <span className="expense-line-label">Expense {index + 1}</span>
              {lines.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeLine(index)}>
                  Remove
                </button>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <input
                type="text"
                className="form-input"
                value={line.description}
                onChange={(e) => updateLine(index, 'description', e.target.value)}
                placeholder="What was this payment for?"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={line.category}
                  onChange={(e) => updateLine(index, 'category', e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={line.amount}
                  onChange={(e) => updateLine(index, 'amount', e.target.value)}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment mode</label>
                <select
                  className="form-select"
                  value={line.paymentMode}
                  onChange={(e) => updateLine(index, 'paymentMode', e.target.value)}
                >
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  value={line.remarks}
                  onChange={(e) => updateLine(index, 'remarks', e.target.value)}
                  placeholder="Vendor, bill no., notes…"
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-secondary" onClick={addLine} disabled={lines.length >= 25}>
          <Plus size={16} /> Add another expense
        </button>

        <div className="expense-batch-total">
          Batch total: <strong>{formatCurrency(lineTotal)}</strong> ({lines.length} line{lines.length === 1 ? '' : 's'})
        </div>

        <div className="form-group">
          <label className="form-label">Receipt / bill (optional, applies to all lines)</label>
          <FileUpload onFileSelect={setFiles} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : (lines.length === 1 ? 'Save expense' : `Save ${lines.length} expenses`)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
