/**
 * Setup Wizard Page
 * First-time setup: creates Drive folders and Google Sheet
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, FileSpreadsheet, CheckCircle, Loader, Shield, ArrowRight, Search, FlaskConical, FilePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setupFolderStructure, findExistingSpreadsheet } from '../services/googleDrive';
import {
  createSpreadsheet, addAccessControl, addAuditLog, addReminder, getAccessControl,
  parseApiError, ensureSheetStructure,
} from '../services/googleSheets';
import { STORAGE_KEYS, APP_NAME, SHEET_FILE_NAME, DEFAULT_REMINDERS } from '../config/constants';
import { calculateNextDue, getLastDayOfCurrentMonth, getFirstDayOfNextMonth, normalizeEmail } from '../utils/helpers';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Shield },
  { id: 'folders', title: 'Set Up Folders', icon: FolderPlus },
  { id: 'sheet', title: 'Connect Sheet', icon: FileSpreadsheet },
  { id: 'done', title: 'All Set!', icon: CheckCircle },
];

export default function Setup() {
  const { user } = useAuth();
  const { completeSetup, showToast } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ folderId: null, spreadsheetId: null, foundExisting: false, mode: 'fresh' });
  const [setupMode, setSetupMode] = useState('sample');

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

  // Check if already set up
  const existingSpreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);

  const handleConnectExisting = () => {
    if (existingSpreadsheetId) {
      completeSetup();
      navigate('/');
    }
  };

  const handleSetup = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create/find folders
      setCurrentStep(1);
      const folders = await setupFolderStructure();

      // Step 2: Search Drive for existing spreadsheet — never create duplicates
      setCurrentStep(2);
      let spreadsheetId = null;
      let foundExisting = false;

      const existingSheet = await findExistingSpreadsheet(SHEET_FILE_NAME);
      if (existingSheet) {
        // Reuse the existing spreadsheet — it is the source of truth
        spreadsheetId = existingSheet.id;
        localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
        foundExisting = true;

        // Verify the current user is in the access control list
        let aclEntries = [];
        try {
          aclEntries = await getAccessControl();
        } catch {
          // ACL read failed — allow reconnect for the sheet owner
        }
        const isAuthorized = aclEntries.some(u => normalizeEmail(u.email) === normalizeEmail(user.email) && u.status === 'Active');

        if (!isAuthorized && aclEntries.length > 0) {
          // Sheet exists and has users, but this user is not listed
          setError(`Access denied. Your email (${user.email}) is not authorized to use this app. Contact the Treasurer or President to be added.`);
          setProcessing(false);
          setCurrentStep(0);
          return;
        }

        if (!isAuthorized) {
          await addAccessControl({ email: user.email, role: 'Owner', flat: '', addedBy: 'System' });
        }
        await ensureSheetStructure(spreadsheetId);
      } else {
        spreadsheetId = await createSpreadsheet(folders.rootId, { mode: setupMode });

        // Add current user as Owner
        await addAccessControl({ email: user.email, role: 'Owner', flat: '', addedBy: 'System' });

        // Seed default reminders so they're ready to use
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

        await addAuditLog(user.email, 'SETUP', 'Initial app setup completed');
      }

      setResults({ folderId: folders.rootId, spreadsheetId, foundExisting, mode: setupMode });

      // Step 3: Done
      setCurrentStep(3);
      completeSetup();
      showToast(foundExisting ? 'Reconnected to existing data. Welcome back!' : 'Setup complete! Welcome to your expense tracker.', 'success');
    } catch (err) {
      console.error('Setup error:', err);
      setError(parseApiError(err) || err.message || 'Setup failed. Please try again.');
      setProcessing(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-container animate-fade-in-up">
        {/* Progress */}
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

        {/* Content */}
        <div className="setup-content">
          {currentStep === 0 && (
            <div className="setup-welcome">
              <div className="setup-logo">
                <Shield size={48} />
              </div>
              <h2>Welcome to {APP_NAME}</h2>
              <p>Let's connect your apartment expense tracker. This will:</p>
              <ul className="setup-checklist">
                <li>Search for an existing <strong>TPT-MaintenanceTracker</strong> in your Google Drive</li>
                <li>Create it only if it doesn't already exist — the Google Sheet stays the source of truth</li>
                <li>Set up the Drive folder structure and add you as the first Owner</li>
              </ul>

              <div className="setup-mode-grid">
                <button
                  type="button"
                  className={`setup-mode-card ${setupMode === 'sample' ? 'setup-mode-card-active' : ''}`}
                  onClick={() => setSetupMode('sample')}
                >
                  <FlaskConical size={22} />
                  <strong>Test with sample data</strong>
                  <span>Fills live tabs with pretend Sep–Oct 2026 data so you can click through the app. A Guide tab and a Sample Data tab explain every column.</span>
                </button>
                <button
                  type="button"
                  className={`setup-mode-card ${setupMode === 'fresh' ? 'setup-mode-card-active' : ''}`}
                  onClick={() => setSetupMode('fresh')}
                >
                  <FilePlus size={22} />
                  <strong>Start fresh (production)</strong>
                  <span>Empty live tabs for real collections. Guide + Sample Data stay as a readable template. Use this after testing, or from Settings later.</span>
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

                {existingSpreadsheetId && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleConnectExisting}
                  >
                    Use Stored Setup
                  </button>
                )}
              </div>
            </div>
          )}

          {(currentStep === 1 || currentStep === 2) && (
            <div className="setup-processing">
              <Loader size={48} className="animate-spin" />
              <h3>{STEPS[currentStep].title}...</h3>
              <p className="text-muted">
                {currentStep === 1
                  ? 'Setting up folder structure in your Google Drive...'
                  : 'Searching for existing spreadsheet or creating new one...'}
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-done">
              <div className="setup-done-icon">
                <CheckCircle size={56} />
              </div>
              <h2>All Set! 🎉</h2>
              <p>
                {results.foundExisting
                  ? 'Reconnected to your existing data.'
                  : results.mode === 'sample'
                    ? 'Sample workbook is ready. Open the Guide tab in Google Sheets — every column is explained there.'
                    : 'Empty production workbook is ready. The Guide and Sample Data tabs are your reference; live tabs start blank.'}
              </p>

              <div className="setup-summary card">
                <p><strong>Google Drive:</strong> TPT-AppartmentApp folder ready</p>
                <p><strong>Spreadsheet:</strong> {results.foundExisting ? 'Reconnected to existing TPT-MaintenanceTracker' : `TPT-MaintenanceTracker created (${results.mode === 'sample' ? 'sample data' : 'fresh'})`}</p>
                <p><strong>Your Role:</strong> Owner</p>
                <p><strong>After testing:</strong> Settings → Create Fresh Production Sheet. The sample file is archived in Drive.</p>
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
                onClick={() => { setCurrentStep(0); setError(null); }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
