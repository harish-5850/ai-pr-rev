'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Check, Zap, Crown } from 'lucide-react';

export default function BillingPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getPlans(), api.getBillingStatus()])
            .then(([p, s]) => {
                setPlans(p.plans);
                setStatus(s);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="dashboard-loading">Loading...</div>;

    const planIcons: Record<string, any> = { FREE: Check, PRO: Zap, ENTERPRISE: Crown };

    return (
        <div className="dashboard-content">
            <h1 className="page-title">Billing</h1>

            {/* Current Plan */}
            <div className="card billing-status">
                <h2 className="card-title">Current Plan</h2>
                <div className="billing-grid">
                    <div>
                        <span className="plan-badge">{status?.plan || 'FREE'}</span>
                        <p className="billing-usage">
                            {status?.reviewsUsed ?? 0} / {status?.reviewsLimit ?? 50} reviews used
                        </p>
                    </div>
                    <div className="usage-bar-container">
                        <div
                            className="usage-bar"
                            style={{
                                width: `${Math.min(
                                    100,
                                    ((status?.reviewsUsed ?? 0) / (status?.reviewsLimit ?? 50)) * 100,
                                )}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Plans */}
            <div className="plans-grid">
                {plans.map((plan: any) => {
                    const Icon = planIcons[plan.id] || Check;
                    const isCurrent = status?.plan === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className={`card plan-card ${isCurrent ? 'plan-current' : ''}`}
                        >
                            <div className="plan-header">
                                <Icon size={28} />
                                <h3>{plan.name}</h3>
                                <span className="plan-price">
                                    {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                                </span>
                            </div>
                            <ul className="plan-features">
                                {plan.features.map((f: string, i: number) => (
                                    <li key={i}>
                                        <Check size={14} /> {f}
                                    </li>
                                ))}
                            </ul>
                            {isCurrent ? (
                                <button className="btn btn-outline" disabled>
                                    Current Plan
                                </button>
                            ) : plan.price > 0 ? (
                                <button className="btn btn-primary">Upgrade to {plan.name}</button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
