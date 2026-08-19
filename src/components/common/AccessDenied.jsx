/**
 * AccessDenied — full-page blocker for authenticated-but-unauthorised users.
 * Shows NOTHING about the app: no data, no sheet links, no contact info.
 */

import { ShieldOff, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
                    Your Google account is not authorised to access this application.
                </p>

                <p className="access-denied-hint">
                    Contact the Treasurer or President of The Pride of Tirumala to request access.
                </p>

                <button className="btn btn-secondary access-denied-signout" onClick={handleSignOut}>
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
    );
}
