'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
    LayoutDashboard,
    GitPullRequest,
    FolderGit2,
    Settings,
    CreditCard,
    LogOut,
    Bot,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/pulls', label: 'Pull Requests', icon: GitPullRequest },
    { href: '/dashboard/repos', label: 'Repositories', icon: FolderGit2 },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <Bot size={28} />
                <span>AI PR Reviewer</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {user && (
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        {user.avatarUrl && (
                            <img
                                src={user.avatarUrl}
                                alt={user.login}
                                className="sidebar-avatar"
                            />
                        )}
                        <span className="sidebar-username">{user.login}</span>
                    </div>
                </div>
            )}

            <div className="sidebar-bottom-actions">
                <button className="sidebar-logout" onClick={logout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
