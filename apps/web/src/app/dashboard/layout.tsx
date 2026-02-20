'use client';

import React from 'react';
import './dashboard.css';
import Sidebar from '@/components/sidebar';
import { AuthProvider } from '@/context/auth-context';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <div className="dashboard-layout">
                <Sidebar />
                <main className="dashboard-main">{children}</main>
            </div>
        </AuthProvider>
    );
}
