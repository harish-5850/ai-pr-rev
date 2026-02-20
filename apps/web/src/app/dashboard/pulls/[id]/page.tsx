'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

const severityIcons: Record<string, any> = {
    HIGH: AlertTriangle,
    MEDIUM: AlertCircle,
    LOW: Info,
};

const severityColors: Record<string, string> = {
    HIGH: 'severity-high',
    MEDIUM: 'severity-medium',
    LOW: 'severity-low',
};

export default function PullDetailPage() {
    const params = useParams();
    const [pull, setPull] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params?.id) {
            api.getPull(params.id as string)
                .then(setPull)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [params?.id]);

    if (loading) return <div className="dashboard-loading">Loading...</div>;
    if (!pull) return <div className="card"><p className="empty-state">Pull request not found.</p></div>;

    return (
        <div className="dashboard-content">
            <Link href="/dashboard/pulls" className="back-link">
                <ArrowLeft size={16} /> Back to Pull Requests
            </Link>

            <h1 className="page-title">
                #{pull.number} {pull.title}
            </h1>
            <p className="pull-meta">
                {pull.repository?.fullName} &bull; {pull.authorLogin} &bull;{' '}
                {new Date(pull.createdAt).toLocaleDateString()}
            </p>

            {pull.reviews?.map((review: any) => (
                <div key={review.id} className="card review-detail-card">
                    <h2 className="card-title">
                        Review — {new Date(review.createdAt).toLocaleString()}
                    </h2>

                    {review.summary && (
                        <div className="review-summary">
                            <p>{review.summary}</p>
                        </div>
                    )}

                    {review.issues?.length > 0 && (
                        <div className="issues-list">
                            {review.issues.map((issue: any) => {
                                const Icon = severityIcons[issue.severity] || Info;
                                const colorClass = severityColors[issue.severity] || '';

                                return (
                                    <div key={issue.id} className={`issue-item ${colorClass}`}>
                                        <div className="issue-header">
                                            <Icon size={16} />
                                            <span className="issue-severity">{issue.severity}</span>
                                            <span className="issue-category">{issue.category}</span>
                                        </div>
                                        <p className="issue-message">{issue.message}</p>
                                        {issue.filePath && (
                                            <code className="issue-file">
                                                {issue.filePath}
                                                {issue.lineNumber && `:${issue.lineNumber}`}
                                            </code>
                                        )}
                                        {issue.suggestion && (
                                            <pre className="issue-suggestion">{issue.suggestion}</pre>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
