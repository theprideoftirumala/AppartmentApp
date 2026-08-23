/**
 * Setup Wizard — founding owner only.
 *
 * SECURITY: Other Google accounts must never reach "create spreadsheet".
 * Members are added in Settings and receive a shared, read-only copy of the
 * one society workbook (TPT-MaintenanceTracker).
 *
 * Create cards appear only after Drive search confirms the workbook is missing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FolderPlus, FileSpreadsheet, CheckCircle, Loader, Shield, ArrowRight, Search, FlaskConical, FilePlus, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setupFolderStructure, findSocietySpreadsheet } from '../services/googleDrive';
import {
  createSpreadsheet, addAuditLog, addReminder,
  parseApiError, ensureSheetStructure, ensureFoundingOwnerEntry,
} from '../services/googleSheets';
import { DEFAULT_REMINDERS, SHEET_FILE_NAME, STORAGE_KEYS } from '../config/constants';
import { FOUNDING_OWNER_EMAIL, isFoundingOwner, maskEmail } from '../config/accessPolicy';
import { calculateNextDue, getLastDayOfCurrentMonth, getFirstDayOfNextMonth, bindSpreadsheet, isValidSpreadsheetId } from '../utils/helpers';
import { shouldOfferSheetCreation } from '../utils/setupFlow';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Shield },
  { id: 'folders', title: 'Set Up Folders', icon: FolderPlus },
  { id: 'sheet', title: 'Connect Sheet', icon: FileSpreadsheet },
  { id: 'done', title: 'All Set!', icon: CheckCircle },
];

const OWNER_EMAIL_MASKED = maskEmail(FOUNDING_OWNER_EMAIL);

export default function Setup() {
  const { user, setAccessDenied } = useAuth();
  const { completeSetup, isSetupComplete, showToast } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [looking, setLooking] = useState(true);
  const [searchConfirmedEmpty, setSearchConfirmedEmpty] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ folderId: null, spreadsheetId: null, foundExisting: false, mode: 'fresh' });
  const [setupMode, setSetupMode] = useState('sample');
  const founder = isFoundingOwner(user?.email);
  const alreadyBound = isValidSpreadsheetId(localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID));
  const showCreateCards = shouldOfferSheetCreation({
    searchConfirmedEmpty,
    lookupFailed,
    alreadyBound,
  });

  const renderErrorMessage = (text) => {
    if (!text) return null;
    const str = String(text);
    const parts = str.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, idx) => {
      if (/^https?:\/\//.test(part)) {
        return (
          <a key={`${part}-${idx}`} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        );
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  const reconnectExisting = useCallback(async (spreadsheetId, folderId = null) => {
    bindSpreadsheet(spreadsheetId, user.email);
    await ensureSheetStructure(spreadsheetId).catch(() => {});
    await ensureFoundingOwnerEntry(user.email);
    setResults({ folderId, spreadsheetId, foundExisting: true, mode: 'existing' });
    completeSetup();
    showToast('Connected to the existing society sheet.', 'success');
    navigate('/', { replace: true });
  }, [completeSetup, navigate, showToast, user?.email]);

  const searchGen = useRef(0);
  const autoSearchKey = useRef('');

  const lookForExistingSheet = useCallback(async () => {
    if (!founder) return;
    const gen = ++searchGen.current;
    setLooking(true);
    setLookupFailed(false);
    setSearchConfirmedEmpty(false);
    setError(null);
    try {
      const folders = await setupFolderStructure();
      const existing = await findSocietySpreadsheet(user.email);
      if (gen !== searchGen.current) return;
      if (existing?.id) {
        setCurrentStep(2);
        await reconnectExisting(existing.id, folders?.rootId);
        return;
      }
      setSearchConfirmedEmpty(true);
      setCurrentStep(0);
    } catch (err) {
      if (gen !== searchGen.current) return;
      console.error('Society sheet lookup failed:', err);
      setLookupFailed(true);
      setError(parseApiError(err) || err.message || 'Could not search Drive. Please try again.');
    } finally {
      if (gen === searchGen.current) setLooking(false);
    }
  }, [founder, reconnectExisting, user?.email]);

  useEffect(() => {
    if (!founder) return;
    if (isSetupComplete && alreadyBound) return;
    const key = user?.email || '';
    if (autoSearchKey.current === key) return;
    autoSearchKey.current = key;
    lookForExistingSheet();
  }, [alreadyBound, founder, isSetupComplete, lookForExistingSheet, user?.email]);

  const handleSetup = async () => {
    if (!founder) {
      setAccessDenied(true);
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      setCurrentStep(1);
      const folders = await setupFolderStructure();

      setCurrentStep(2);
      let spreadsheetId = null;
      let foundExisting = false;

      const existingSheet = await findSocietySpreadsheet(user.email);
      if (existingSheet) {
        spreadsheetId = existingSheet.id;
        bindSpreadsheet(spreadsheetId, user.email);
        foundExisting = true;
        await ensureSheetStructure(spreadsheetId).catch(() => {});
        await ensureFoundingOwnerEntry(user.email);
      } else {
        spreadsheetId = await createSpreadsheet(folders.rootId, { mode: setupMode });
        bindSpreadsheet(spreadsheetId, user.email);
        await ensureFoundingOwnerEntry(user.email);

        for (const reminder of DEFAULT_REMINDERS) {
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
            createdBy: 'System',
          });
        }

        await addAuditLog(user.email, 'SETUP', 'Initial society workbook setup completed');
      }

      setResults({ folderId: folders.rootId, spreadsheetId, foundExisting, mode: setupMode });
      setCurrentStep(3);
      completeSetup();
      showToast(foundExisting ? 'Reconnected to the society spreadsheet.' : 'Society spreadsheet is ready. Add residents as Readers in Settings.', 'success');
    } catch (err) {
      console.error('Setup error:', err);
      setError(parseApiError(err) || err.message || 'Setup failed. Please try again.');
      setProcessing(false);
      setCurrentStep(0);
    }
  };

  const copySheetId = async () => {
    if (!results.spreadsheetId) return;
    try {
      await navigator.clipboard.writeText(results.spreadsheetId);
      showToast('Spreadsheet ID copied. Paste it into public/sheet-config.json if you deploy a new build.', 'success');
    } catch {
      showToast(results.spreadsheetId, 'info');
    }
  };

  if (founder && isSetupComplete && alreadyBound && currentStep === 0 && !processing) {
    return <Navigate to="/" replace />;
  }

  if (!founder) {
    return (
      <div className="setup-page">
        <div className="setup-container animate-fade-in-up">
          <div className="setup-content">
            <div className="setup-welcome">
              <div className="setup-logo">
                <Shield size={48} />
              </div>
              <h2>This account cannot create the tracker</h2>
              <p>
                Only the society owner ({OWNER_EMAIL_MASKED}) may create the society Google Sheet.
                Other residents get <strong>read-only</strong> access after that owner adds them in Settings.
              </p>
              <p className="text-muted mt-3">
                Signed in as {user?.email ? maskEmail(user.email) : 'unknown'}. Ask the owner to add this email and share
                {' '}<strong>{SHEET_FILE_NAME}</strong> as Viewer — do not create a second spreadsheet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="setup-container animate-fade-in-up">
        <div className="setup-progress">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`setup-step ${i <= currentStep ? 'setup-step-active' : ''} ${i < currentStep ? 'setup-step-done' : ''}`}
            >
              <div className="setup-step-icon">
                {i < currentStep ? <CheckCircle size={20} /> : <step.icon size={20} />}
              </div>
              <span className="setup-step-label">{step.title}</span>
            </div>
          ))}
        </div>

        <div className="setup-content">
          {looking && currentStep === 0 && (
            <div className="setup-processing">
              <Loader size={48} className="animate-spin" />
              <h3>Looking for the society sheet…</h3>
              <p className="text-muted">
                Searching Drive for an existing <strong>{SHEET_FILE_NAME}</strong>. Create is offered only if it is not found.
              </p>
            </div>
          )}

          {showCreateCards && currentStep === 0 && (
            <div className="setup-welcome">
              <div className="setup-logo">
                <Shield size={48} />
              </div>
              <h2>Create the society sheet (first time)</h2>
              <p>
                No <strong>{SHEET_FILE_NAME}</strong> workbook was found. Create the single society file now.
                Residents you add later will share this file as Viewers — they will not get their own sheet.
              </p>
              <ul className="setup-checklist">
                <li>Drive was searched for <strong>{SHEET_FILE_NAME}</strong> owned by {OWNER_EMAIL_MASKED}</li>
                <li>Create it only because it does not already exist</li>
                <li>Add residents from Settings → Access Control (default role: Reader)</li>
              </ul>

              <div className="setup-mode-grid">
                <button
                  type="button"
                  className={`setup-mode-card ${setupMode === 'sample' ? 'setup-mode-card-active' : ''}`}
                  onClick={() => setSetupMode('sample')}
                >
                  <FlaskConical size={22} />
                  <strong>Test with sample data</strong>
                  <span>Fills live tabs with pretend Sep–Oct 2026 data so you can click through the app.</span>
                </button>
                <button
                  type="button"
                  className={`setup-mode-card ${setupMode === 'fresh' ? 'setup-mode-card-active' : ''}`}
                  onClick={() => setSetupMode('fresh')}
                >
                  <FilePlus size={22} />
                  <strong>Start fresh (production)</strong>
                  <span>Empty live tabs for real collections. Guide + Sample Data stay as a readable template.</span>
                </button>
              </div>

              <div className="setup-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSetup}
                  disabled={processing}
                >
                  <Search size={18} /> {setupMode === 'sample' ? 'Create sample sheet' : 'Create empty sheet'} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {(currentStep === 1 || currentStep === 2) && (
            <div className="setup-processing">
              <Loader size={48} className="animate-spin" />
              <h3>{STEPS[currentStep].title}...</h3>
              <p className="text-muted">
                {currentStep === 1
                  ? 'Setting up folder structure in Google Drive...'
                  : 'Connecting the existing society spreadsheet...'}
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-done">
              <div className="setup-done-icon">
                <CheckCircle size={56} />
              </div>
              <h2>All Set</h2>
              <p>
                {results.foundExisting
                  ? 'Reconnected to the existing society workbook.'
                  : results.mode === 'sample'
                    ? 'Sample workbook is ready. Add residents as Readers from Settings before they sign in.'
                    : 'Empty production workbook is ready. Add residents as Readers from Settings.'}
              </p>

              <div className="setup-summary card">
                <p><strong>Google Drive:</strong> TPT-AppartmentApp folder ready</p>
                <p><strong>Spreadsheet:</strong> {results.foundExisting ? 'Reconnected TPT-MaintenanceTracker' : `TPT-MaintenanceTracker created (${results.mode === 'sample' ? 'sample data' : 'fresh'})`}</p>
                <p><strong>Your role:</strong> Owner ({OWNER_EMAIL_MASKED})</p>
                {results.spreadsheetId && (
                  <p className="sheet-id-row">
                    <strong>Sheet ID:</strong> <code className="sheet-id-code">{results.spreadsheetId}</code>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={copySheetId} aria-label="Copy spreadsheet ID">
                      <Copy size={14} />
                    </button>
                  </p>
                )}
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/')}
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            </div>
          )}

          {error && (
            <div className="setup-error">
              <p className="text-danger">{renderErrorMessage(error)}</p>
              <button
                className="btn btn-secondary"
                onClick={() => { setCurrentStep(0); setError(null); lookForExistingSheet(); }}
              >
                Search again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
