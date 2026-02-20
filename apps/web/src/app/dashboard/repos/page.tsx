'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FolderGit2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

export default function ReposPage() {
    const [repos, setRepos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const loadRepos = () => {
        setLoading(true);
        api.getRepos()
            .then(setRepos)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadRepos();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.syncRepos();
            loadRepos();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleToggle = async (id: string) => {
        const updated = await api.toggleRepo(id);
        setRepos((prev) =>
            prev.map((r) => (r.id === id ? { ...r, isActive: updated.isActive } : r)),
        );
    };

    return (
        <div className="dashboard-content">
            <div className="page-header">
                <h1 className="page-title">Repositories</h1>
                <button
                    className="btn btn-primary sync-btn"
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Repositories'}
                </button>
            </div>

            {loading ? (
                <div className="dashboard-loading">Loading...</div>
            ) : repos.length === 0 ? (
                <div className="card">
                    <p className="empty-state">No repositories found. Install the GitHub App on your org/repos.</p>
                </div>
            ) : (
                <div className="repos-grid">
                    {repos.map((repo) => (
                        <div key={repo.id} className="card repo-card">
                            <div className="repo-header">
                                <FolderGit2 size={20} />
                                <h3>{repo.fullName}</h3>
                            </div>
                            <div className="repo-stats">
                                <span>{repo._count?.pullRequests ?? 0} PRs</span>
                                <span>{repo.organization?.name}</span>
                            </div>
                            <div className="repo-footer">
                                <button
                                    className="toggle-btn"
                                    onClick={() => handleToggle(repo.id)}
                                >
                                    {repo.isActive ? (
                                        <><ToggleRight size={20} className="text-green" /> Active</>
                                    ) : (
                                        <><ToggleLeft size={20} className="text-muted" /> Inactive</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
