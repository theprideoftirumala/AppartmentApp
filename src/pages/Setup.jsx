/**
 * Setup Wizard — founding owner only.
 *
 * Connects the one APP-TPT-Tracker in TPT-APP-Tracker.
 * Reuses that file on every login. Creates it only when the founding
 * owner clicks Create after Drive search finds none. Members never create.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FolderPlus, FileSpreadsheet, CheckCircle, Loader, Shield, ArrowRight, Search, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setupFolderStructure, findSocietySpreadsheet, createBackup } from '../services/googleDrive';
import {
  addAuditLog, addReminder, getReminders,
  parseApiError, ensureSheetStructure, ensureFoundingOwnerEntry, createSpreadsheet,
} from '../services/googleSheets';
import { DEFAULT_REMINDERS, DRIVE_ROOT_FOLDER, GOOGLE_SHEET_MIME, SHEET_FILE_NAME, STORAGE_KEYS, isGoogleSpreadsheetMime } from '../config/constants';
import { FOUNDING_OWNER_EMAIL, isFoundingOwner, maskEmail } from '../config/accessPolicy';
import { calculateNextDue, getLastDayOfCurrentMonth, getFirstDayOfNextMonth, bindSpreadsheet, isValidSpreadsheetId } from '../utils/helpers';
import {
  planSocietyWorkbook,
  shouldOfferSheetCreation,
  shouldShowMissingSheetHelp,
} from '../utils/setupFlow';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Shield },
  { id: 'folders', title: 'Set Up Folders', icon: FolderPlus },
  { id: 'sheet', title: 'Connect Sheet', icon: FileSpreadsheet },
  { id: 'done', title: 'All Set!', icon: CheckCircle },
];

const OWNER_EMAIL_MASKED = maskEmail(FOUNDING_OWNER_EMAIL);
const DRIVE_HOME = 'https://drive.google.com';

function CreateWorkbookHelp({ foundXlsx, creating, canCreate, onSearch, onCreate }) {
  return (
    <div className="setup-welcome">
      <div className="setup-logo">
        <Shield size={48} />
      </div>
      <h2>{foundXlsx ? 'Convert that Excel file first' : `Create ${SHEET_FILE_NAME}`}</h2>
      <p>
        {foundXlsx
          ? <>Found an Excel file named like <strong>{SHEET_FILE_NAME}</strong>. Convert it to a Google Sheet. Residents you add will reuse that same file.</>
          : <>No <strong>{SHEET_FILE_NAME}</strong> was found. Create it once in <strong>{DRIVE_ROOT_FOLDER}</strong>. Residents you grant access reuse this sheet — they never get a second copy.</>}
      </p>
      {foundXlsx && (
        <ol className="setup-steps">
          <li>Open <a href={DRIVE_HOME} target="_blank" rel="noreferrer">Google Drive</a>.</li>
          <li>Right-click the file → <strong>Open with → Google Sheets</strong>.</li>
          <li><strong>File → Save as Google Sheets</strong> and name it <strong>{SHEET_FILE_NAME}</strong>.</li>
          <li>Return here and tap Search again.</li>
        </ol>
      )}
      <div className="setup-actions">
        <a className="btn btn-secondary btn-lg setup-drive-link" href={DRIVE_HOME} target="_blank" rel="noreferrer">
          <ExternalLink size={18} /> Open Drive
        </a>
        <button className="btn btn-secondary btn-lg" type="button" onClick={onSearch}>
          <Search size={18} /> Search again
        </button>
        {canCreate ? (
          <button className="btn btn-primary btn-lg" type="button" disabled={creating} onClick={onCreate}>
            <FileSpreadsheet size={18} /> {creating ? 'Creating…' : `Create ${SHEET_FILE_NAME}`} <ArrowRight size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

async function backupThenExtend(spreadsheetId, userEmail, { reason = 'pre-setup' } = {}) {
  let backedUp = false;
  try {
    await createBackup(spreadsheetId, { reason });
    backedUp = true;
  } catch (err) {
    console.warn('Pre-setup backup skipped', err);
  }
  bindSpreadsheet(spreadsheetId, userEmail);
  await ensureSheetStructure(spreadsheetId);
  await ensureFoundingOwnerEntry(userEmail);
  const reminders = await getReminders().catch(() => []);
  if (!reminders.length) {
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
  }
  return backedUp;
}

export default function Setup() {
  const { user } = useAuth();
  const { completeSetup, isSetupComplete, showToast } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [looking, setLooking] = useState(true);
  const [searchConfirmedEmpty, setSearchConfirmedEmpty] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [needsGoogleSheet, setNeedsGoogleSheet] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState({ folderId: null, spreadsheetId: null, foundExisting: false, backedUp: false });
  const founder = isFoundingOwner(user?.email);
  const alreadyBound = isValidSpreadsheetId(localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID));
  const showMissingHelp = shouldShowMissingSheetHelp({
    searchConfirmedEmpty,
    lookupFailed,
    alreadyBound,
  });
  const canCreate = shouldOfferSheetCreation({
    isFounder: founder,
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
    const backedUp = await backupThenExtend(spreadsheetId, user.email);
    setResults({ folderId, spreadsheetId, foundExisting: true, backedUp });
    await addAuditLog(user.email, 'SETUP', `Connected ${SHEET_FILE_NAME}`).catch(() => {});
    completeSetup();
    showToast(
      backedUp
        ? `Backed up, then connected ${SHEET_FILE_NAME}. Balance formulas start at Sep-26 with opening surplus ₹612.`
        : `Connected ${SHEET_FILE_NAME}. Backup was skipped — use Settings → Backups if needed.`,
      backedUp ? 'success' : 'info',
    );
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
    setNeedsGoogleSheet(false);
    setError(null);
    try {
      const folders = await setupFolderStructure();
      const existing = await findSocietySpreadsheet(user.email);
      if (gen !== searchGen.current) return;
      if (existing?.id && isGoogleSpreadsheetMime(existing.mimeType || GOOGLE_SHEET_MIME)) {
        setCurrentStep(2);
        await reconnectExisting(existing.id, folders?.rootId);
        return;
      }
      if (existing?.id && !isGoogleSpreadsheetMime(existing.mimeType)) {
        setNeedsGoogleSheet(true);
        setSearchConfirmedEmpty(false);
        setCurrentStep(0);
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

  const createFreshWorkbook = useCallback(async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    setCurrentStep(2);
    try {
      const folders = await setupFolderStructure();
      const existing = await findSocietySpreadsheet(user.email);
      const existingId = existing?.id && isGoogleSpreadsheetMime(existing.mimeType || GOOGLE_SHEET_MIME)
        ? existing.id
        : null;
      const plan = planSocietyWorkbook({
        email: user.email,
        existingSheetId: existingId,
        alreadyBound,
        searchConfirmedEmpty: true,
        lookupFailed: false,
      });
      if (plan.action === 'reuse' && plan.spreadsheetId) {
        await reconnectExisting(plan.spreadsheetId, folders?.rootId);
        return;
      }
      if (!plan.allowCreate) {
        setCurrentStep(0);
        setError(`Could not create ${SHEET_FILE_NAME}. Search again to reuse the existing society sheet.`);
        return;
      }
      const spreadsheetId = await createSpreadsheet();
      bindSpreadsheet(spreadsheetId, user.email);
      await ensureFoundingOwnerEntry(user.email);
      const reminders = await getReminders().catch(() => []);
      if (!reminders.length) {
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
      }
      setResults({ folderId: folders?.rootId || null, spreadsheetId, foundExisting: false, backedUp: false });
      await addAuditLog(user.email, 'SETUP', `Created ${SHEET_FILE_NAME}`).catch(() => {});
      completeSetup();
      showToast(`${SHEET_FILE_NAME} is ready in ${DRIVE_ROOT_FOLDER}. Opening surplus ₹612. First month Sep-26.`, 'success');
      setCurrentStep(3);
    } catch (err) {
      setCurrentStep(0);
      setError(parseApiError(err) || err.message || 'Could not create the workbook.');
    } finally {
      setCreating(false);
    }
  }, [alreadyBound, canCreate, completeSetup, reconnectExisting, showToast, user?.email]);

  const copySheetId = async () => {
    if (!results.spreadsheetId) return;
    try {
      await navigator.clipboard.writeText(results.spreadsheetId);
      showToast('Spreadsheet ID copied. Paste it into public/sheet-config.json if you deploy a new build.', 'success');
    } catch {
      showToast(results.spreadsheetId, 'info');
    }
  };

  if (founder && isSetupComplete && alreadyBound && currentStep === 0) {
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
              <h2>This account cannot connect the tracker</h2>
              <p>
                Only the society owner ({OWNER_EMAIL_MASKED}) may connect <strong>{SHEET_FILE_NAME}</strong>.
                Other residents get <strong>read-only</strong> access after that owner adds them in Settings.
              </p>
              <p className="text-muted mt-3">
                Signed in as {user?.email ? maskEmail(user.email) : 'unknown'}. Ask the owner to add this email and share
                {' '}<strong>{SHEET_FILE_NAME}</strong> as Viewer — do not upload a second copy.
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
                Searching Drive for <strong>{SHEET_FILE_NAME}</strong> in <strong>{DRIVE_ROOT_FOLDER}</strong>.
              </p>
            </div>
          )}

          {(needsGoogleSheet || showMissingHelp) && currentStep === 0 && (
            <CreateWorkbookHelp
              foundXlsx={needsGoogleSheet}
              creating={creating}
              canCreate={canCreate}
              onSearch={() => { autoSearchKey.current = ''; lookForExistingSheet(); }}
              onCreate={createFreshWorkbook}
            />
          )}

          {(currentStep === 1 || currentStep === 2) && (
            <div className="setup-processing">
              <Loader size={48} className="animate-spin" />
              <h3>{STEPS[currentStep].title}...</h3>
              <p className="text-muted">
                {currentStep === 1
                  ? 'Setting up folder structure in Google Drive...'
                  : `Connecting ${SHEET_FILE_NAME} and writing Balance formulas...`}
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
                Connected <strong>{SHEET_FILE_NAME}</strong> in <strong>{DRIVE_ROOT_FOLDER}</strong>. Open the Balance tab to see surplus or deficit. First month is Sep-26. Opening surplus is ₹612.
              </p>

              <div className="setup-summary card">
                <p><strong>Google Drive:</strong> {DRIVE_ROOT_FOLDER} folder ready</p>
                <p><strong>Spreadsheet:</strong> {results.foundExisting ? 'Reconnected' : 'Created'} {SHEET_FILE_NAME}{results.backedUp ? ' (backed up first)' : ''}</p>
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
                onClick={() => { setCurrentStep(0); setError(null); autoSearchKey.current = ''; lookForExistingSheet(); }}
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
