import { LogOut, AlertCircle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AccessDeniedProps {
  user: SupabaseUser
  onSignOut: () => void
}

export default function AccessDenied({ user, onSignOut }: AccessDeniedProps) {
  return (
    <div className="app">
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">
            <AlertCircle size={64} color="#f59e0b" />
          </div>
          
          <h1>Access Pending Approval</h1>
          
          <div className="access-denied-message">
            <p className="message-primary">
              Your account is waiting to be approved by an administrator.
            </p>
            <p className="message-secondary">
              You'll receive access once an admin approves your account. Please check back later.
            </p>
          </div>
          
          <div className="user-info-box">
            <h3>Your Account</h3>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">
                {user.user_metadata?.full_name || 'Not provided'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="status-badge status-pending">Pending Approval</span>
            </div>
          </div>
          
          <div className="access-denied-actions">
            <button 
              className="sign-out-btn"
              onClick={onSignOut}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
          
          <div className="help-text">
            <p>
              Need help? Contact your supervisor or administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
