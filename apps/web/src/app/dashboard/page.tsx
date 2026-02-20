'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { GitPullRequest, Code, AlertTriangle, CheckCircle } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface Stats {
    totalRepos: number;
    totalPRs: number;
    totalReviews: number;
    totalIssues: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getStats(),
            api.getIssueTrends(8),
            api.getRecentReviews(5),
        ])
            .then(([s, t, r]) => {
                setStats(s);
                setTrends(t);
                setRecentReviews(r);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="dashboard-loading">Loading...</div>;
    }

    return (
        <div className="dashboard-content">
            <h1 className="page-title">Dashboard</h1>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">
                        <Code size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalRepos ?? 0}</h3>
                        <p>Repositories</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <GitPullRequest size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalPRs ?? 0}</h3>
                        <p>Pull Requests</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalReviews ?? 0}</h3>
                        <p>Reviews</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.totalIssues ?? 0}</h3>
                        <p>Issues Found</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="card chart-card">
                <h2 className="card-title">Issue Trends (Last 8 Weeks)</h2>
                {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="week" stroke="#888" fontSize={12} />
                            <YAxis stroke="#888" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a2e',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="high" fill="#ef4444" name="High" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="medium" fill="#f59e0b" name="Medium" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="low" fill="#22c55e" name="Low" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="empty-state">No issue data yet. Reviews will populate this chart.</p>
                )}
            </div>

            {/* Recent Reviews */}
            <div className="card">
                <h2 className="card-title">Recent Reviews</h2>
                {recentReviews.length > 0 ? (
                    <div className="reviews-list">
                        {recentReviews.map((review: any) => (
                            <div key={review.id} className="review-item">
                                <div className="review-info">
                                    <strong>{review.pullRequest?.repository?.fullName}</strong>
                                    <span className="review-pr">
                                        #{review.pullRequest?.number}
                                    </span>
                                </div>
                                <div className="review-meta">
                                    <span className="badge">{review._count?.issues || 0} issues</span>
                                    <span className="review-date">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-state">No reviews yet. Connect a repo and open a PR to get started!</p>
                )}
            </div>
        </div>
    );
}
