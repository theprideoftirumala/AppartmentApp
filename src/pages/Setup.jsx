/**
 * Setup Wizard Page
 * First-time setup: creates Drive folders and Google Sheet
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, FileSpreadsheet, CheckCircle, Loader, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { setupFolderStructure } from '../services/googleDrive';
import { createSpreadsheet } from '../services/googleSheets';
import { addAccessControl, addAuditLog } from '../services/googleSheets';
import { STORAGE_KEYS, APP_NAME } from '../config/constants';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Shield },
  { id: 'folders', title: 'Create Folders', icon: FolderPlus },
  { id: 'sheet', title: 'Create Spreadsheet', icon: FileSpreadsheet },
  { id: 'done', title: 'All Set!', icon: CheckCircle },
];

export default function Setup() {
  const { user } = useAuth();
  const { completeSetup, showToast } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ folderId: null, spreadsheetId: null });

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
      // Step 1: Create folders
      setCurrentStep(1);
      const folders = await setupFolderStructure();

      // Step 2: Create spreadsheet
      setCurrentStep(2);
      const spreadsheetId = await createSpreadsheet(folders.rootId);

      // Add current user as owner
      await addAccessControl({
        email: user.email,
        role: 'Owner',
        flat: '',
        addedBy: 'System',
      });

      // Log setup
      await addAuditLog(user.email, 'SETUP', 'Initial app setup completed');

      setResults({ folderId: folders.rootId, spreadsheetId });

      // Step 3: Done
      setCurrentStep(3);
      completeSetup();
      showToast('Setup complete! Welcome to your expense tracker.', 'success');
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message || 'Setup failed. Please try again.');
      setProcessing(false);
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
              <p>Let's set up your apartment expense tracker. This will:</p>
              <ul className="setup-checklist">
                <li>Create a <strong>TPT-AppartmentApp</strong> folder in your Google Drive</li>
                <li>Create subfolders for expenses evidence and backups</li>
                <li>Create a Google Sheet with all required data sheets</li>
                <li>Set you up as the first Owner</li>
              </ul>

              <div className="setup-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSetup}
                  disabled={processing}
                >
                  Start Setup <ArrowRight size={18} />
                </button>

                {existingSpreadsheetId && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleConnectExisting}
                  >
                    Use Existing Setup
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
                  ? 'Creating folder structure in your Google Drive...'
                  : 'Creating the maintenance tracker spreadsheet...'}
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-done">
              <div className="setup-done-icon">
                <CheckCircle size={56} />
              </div>
              <h2>All Set! 🎉</h2>
              <p>Your expense tracker is ready to use.</p>

              <div className="setup-summary card">
                <p><strong>Google Drive:</strong> TPT-AppartmentApp folder created</p>
                <p><strong>Spreadsheet:</strong> TPT-MaintenanceTracker created with 10 sheets</p>
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
