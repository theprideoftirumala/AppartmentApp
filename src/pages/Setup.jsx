/**
 * Setup Wizard Page
 * First-time setup: creates Drive folders and Google Sheet
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, FileSpreadsheet, CheckCircle, Loader, Shield, ArrowRight, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setupFolderStructure, findExistingSpreadsheet } from '../services/googleDrive';
import { createSpreadsheet, addAccessControl, addAuditLog, addReminder, getAccessControl, parseApiError } from '../services/googleSheets';
import { STORAGE_KEYS, APP_NAME, SHEET_FILE_NAME, DEFAULT_REMINDERS } from '../config/constants';
import { calculateNextDue, getLastDayOfCurrentMonth, getFirstDayOfNextMonth } from '../utils/helpers';

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
  const [results, setResults] = useState({ folderId: null, spreadsheetId: null, foundExisting: false });

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
        const isAuthorized = aclEntries.some(u => u.email === user.email && u.status === 'Active');

        if (!isAuthorized && aclEntries.length > 0) {
          // Sheet exists and has users, but this user is not listed
          setError(`Access denied. Your email (${user.email}) is not authorized to use this app. Contact the Treasurer or President to be added.`);
          setProcessing(false);
          setCurrentStep(0);
          return;
        }

        if (!isAuthorized) {
          // Sheet is empty ACL (edge case) — add as owner
          await addAccessControl({ email: user.email, role: 'Owner', flat: '', addedBy: 'System' });
        }
      } else {
        // No existing spreadsheet — create a fresh one
        spreadsheetId = await createSpreadsheet(folders.rootId);

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

      setResults({ folderId: folders.rootId, spreadsheetId, foundExisting });

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
                <li>Create it only if it doesn't already exist</li>
                <li>Set up the required folder structure</li>
                <li>Set you up as the first Owner</li>
              </ul>

              <div className="setup-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSetup}
                  disabled={processing}
                >
                  <Search size={18} /> Connect or Create <ArrowRight size={18} />
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
              <p>{results.foundExisting ? 'Reconnected to your existing data.' : 'Your expense tracker is ready to use.'}</p>

              <div className="setup-summary card">
                <p><strong>Google Drive:</strong> TPT-AppartmentApp folder ready</p>
                <p><strong>Spreadsheet:</strong> {results.foundExisting ? 'Reconnected to existing TPT-MaintenanceTracker' : 'TPT-MaintenanceTracker created with all sheets'}</p>
                <p><strong>Your Role:</strong> Owner</p>
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
              <p className="text-danger">{error}</p>
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
