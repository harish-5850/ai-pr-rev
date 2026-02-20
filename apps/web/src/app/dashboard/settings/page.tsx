'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="dashboard-content">
            <h1 className="page-title">Settings</h1>

            {/* Profile */}
            <div className="card settings-card">
                <div className="settings-header">
                    <User size={20} />
                    <h2>Profile</h2>
                </div>
                <div className="settings-body">
                    <div className="settings-row">
                        <span className="settings-label">Username</span>
                        <span className="settings-value">{user?.login ?? '—'}</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Email</span>
                        <span className="settings-value">{user?.email ?? '—'}</span>
                    </div>
                    <div className="settings-row">
                        <span className="settings-label">Role</span>
                        <span className="settings-value">{user?.role ?? '—'}</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="card settings-card">
                <div className="settings-header">
                    <Bell size={20} />
                    <h2>Notifications</h2>
                </div>
                <div className="settings-body">
                    <p className="empty-state">
                        Notification preferences coming soon.
                    </p>
                </div>
            </div>

            {/* Security */}
            <div className="card settings-card">
                <div className="settings-header">
                    <Shield size={20} />
                    <h2>Security</h2>
                </div>
                <div className="settings-body">
                    <p className="empty-state">
                        Connected via GitHub OAuth. Your access token is encrypted and stored securely.
                    </p>
                </div>
            </div>
        </div>
    );
}
