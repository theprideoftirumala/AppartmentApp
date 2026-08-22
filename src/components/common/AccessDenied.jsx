/**
 * AccessDenied — full-page blocker for authenticated-but-unauthorised users.
 * Shows NOTHING about financial data: no sheet links, no dashboard.
 */

import { ShieldOff, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FOUNDING_OWNER_EMAIL } from '../../config/accessPolicy';

export default function AccessDenied() {
    const { user, signOut } = useAuth();

    const handleSignOut = () => {
        signOut();
    };

    return (
        <div className="access-denied-page">
            <div className="access-denied-card animate-fade-in-up">
                <div className="access-denied-icon">
                    <ShieldOff size={48} />
                </div>

                <h1 className="access-denied-title">Access Denied</h1>

                {user?.email && (
                    <p className="access-denied-email">{user.email}</p>
                )}

                <p className="access-denied-message">
                    This Google account is not on the society access list, or it is not
                    shared the society spreadsheet as Viewer.
                </p>

                <p className="access-denied-hint">
                    Ask <strong>{FOUNDING_OWNER_EMAIL}</strong> to add you in Settings → Access Control
                    (default role is Reader / view-only). Do not create a second TPT-MaintenanceTracker sheet.
                </p>

                <button className="btn btn-secondary access-denied-signout" onClick={handleSignOut}>
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
    );
}
