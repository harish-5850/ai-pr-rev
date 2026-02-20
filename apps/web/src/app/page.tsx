'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* Background gradient effects */}
            <div
                style={{
                    position: 'absolute',
                    top: '-200px',
                    left: '-200px',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '-200px',
                    right: '-200px',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                {/* ── Hero Section ──────────────────────────────────────── */}
                <section
                    className={mounted ? 'animate-fade-in' : ''}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80vh',
                        textAlign: 'center',
                        gap: '32px',
                    }}
                >
                    {/* Logo / Icon */}
                    <div
                        className="animate-pulse-glow"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '36px',
                        }}
                    >
                        🤖
                    </div>

                    <h1
                        style={{
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            background: 'linear-gradient(135deg, #e8e8f0 0%, #a29bfe 50%, #6c5ce7 100%)',
                            backgroundSize: '200% 200%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'gradient-shift 6s ease infinite',
                        }}
                    >
                        AI PR Reviewer
                    </h1>

                    <p
                        style={{
                            fontSize: '1.25rem',
                            color: 'var(--text-secondary)',
                            maxWidth: '600px',
                            lineHeight: 1.6,
                        }}
                    >
                        Intelligent code reviews powered by AI. Get instant, structured feedback
                        on every Pull Request — catch bugs, improve quality, and ship better code.
                    </p>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api'}/auth/github`}
                            className="btn btn-primary"
                            style={{ fontSize: '16px', padding: '14px 32px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            🚀 Sign in with GitHub
                        </a>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span className="badge badge-success">✅ System Online</span>
                        <span className="badge badge-warning">⚡ v1.0.0-beta</span>
                    </div>
                </section>

                {/* ── Feature Cards ────────────────────────────────────── */}
                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '24px',
                        paddingBottom: '80px',
                    }}
                >
                    {[
                        {
                            icon: '🧠',
                            title: 'AI-Powered Analysis',
                            desc: 'Leverages Claude to understand code context, detect bugs, and suggest improvements with human-like precision.',
                        },
                        {
                            icon: '🔍',
                            title: 'Static Analysis',
                            desc: 'Combines ESLint and Semgrep results with AI insights for comprehensive code quality checks.',
                        },
                        {
                            icon: '📊',
                            title: 'Smart Prioritization',
                            desc: 'Issues ranked by severity (High/Medium/Low) with structured markdown comments directly on your PRs.',
                        },
                        {
                            icon: '⚡',
                            title: 'Lightning Fast',
                            desc: 'Async processing with BullMQ ensures reviews complete in under 5 minutes without blocking your workflow.',
                        },
                        {
                            icon: '🔒',
                            title: 'Secure by Design',
                            desc: 'GitHub App integration with encrypted tokens, webhook signature verification, and OAuth authentication.',
                        },
                        {
                            icon: '📈',
                            title: 'Developer Growth',
                            desc: 'Track code quality trends and developer improvement over time with adaptive explanations.',
                        },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="card"
                            style={{
                                opacity: mounted ? 1 : 0,
                                animation: mounted ? `fadeIn 0.6s ease-out ${i * 0.1}s forwards` : 'none',
                            }}
                        >
                            <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.icon}</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                                {feature.title}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </section>
            </div>
        </main>
    );
}
