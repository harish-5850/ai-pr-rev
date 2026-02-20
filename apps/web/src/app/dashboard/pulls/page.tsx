'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GitPullRequest, Clock, CheckCircle } from 'lucide-react';

export default function PullsPage() {
    const [data, setData] = useState<any>({ items: [], total: 0, page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        api.getPulls({ page: page.toString(), limit: '20' })
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <div className="dashboard-content">
            <h1 className="page-title">Pull Requests</h1>

            {loading ? (
                <div className="dashboard-loading">Loading...</div>
            ) : data.items.length === 0 ? (
                <div className="card">
                    <p className="empty-state">No pull requests found. Install the GitHub App on a repo and open a PR.</p>
                </div>
            ) : (
                <>
                    <div className="card">
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Pull Request</th>
                                        <th>Repository</th>
                                        <th>State</th>
                                        <th>Reviews</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((pr: any) => (
                                        <tr key={pr.id}>
                                            <td>
                                                <Link href={`/dashboard/pulls/${pr.id}`} className="pr-link">
                                                    <GitPullRequest size={14} />
                                                    #{pr.number} {pr.title}
                                                </Link>
                                            </td>
                                            <td>{pr.repository?.fullName}</td>
                                            <td>
                                                <span className={`state-badge ${pr.state?.toLowerCase()}`}>
                                                    {pr.state === 'open' ? <Clock size={12} /> : <CheckCircle size={12} />}
                                                    {pr.state}
                                                </span>
                                            </td>
                                            <td>{pr._count?.reviews || 0}</td>
                                            <td>{new Date(pr.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {data.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="btn btn-outline"
                            >
                                Previous
                            </button>
                            <span>Page {page} of {data.totalPages}</span>
                            <button
                                disabled={page >= data.totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="btn btn-outline"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
