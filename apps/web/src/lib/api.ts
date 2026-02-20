const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        if (res.status === 401) {
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
            throw new Error('Unauthorized');
        }
        throw new Error(`API error: ${res.status}`);
    }

    return res.json();
}

export const api = {
    // Auth
    getMe: () => apiFetch<any>('/auth/me'),
    logout: () => apiFetch<any>('/auth/logout', { method: 'POST' }),

    // Dashboard
    getStats: () => apiFetch<any>('/dashboard/stats'),
    getRecentReviews: (limit = 10) => apiFetch<any>(`/dashboard/recent-reviews?limit=${limit}`),
    getIssueTrends: (weeks = 12) => apiFetch<any>(`/dashboard/issue-trends?weeks=${weeks}`),
    getSeverityBreakdown: () => apiFetch<any>('/dashboard/severity-breakdown'),

    // Repos
    getRepos: () => apiFetch<any[]>('/repos'),
    getRepo: (id: string) => apiFetch<any>(`/repos/${id}`),
    toggleRepo: (id: string) => apiFetch<any>(`/repos/${id}/toggle`, { method: 'PATCH' }),
    syncRepos: () => apiFetch<any>('/repos/sync', { method: 'POST' }),

    // Pulls
    getPulls: (params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params)}` : '';
        return apiFetch<any>(`/pulls${query}`);
    },
    getPull: (id: string) => apiFetch<any>(`/pulls/${id}`),

    // Billing
    getPlans: () => apiFetch<any>('/billing/plans'),
    getBillingStatus: () => apiFetch<any>('/billing/status'),
    subscribe: (plan: string, orgId: string) =>
        apiFetch<any>('/billing/subscribe', {
            method: 'POST',
            body: JSON.stringify({ plan, orgId }),
        }),
    openPortal: (orgId: string) =>
        apiFetch<any>('/billing/portal', {
            method: 'POST',
            body: JSON.stringify({ orgId }),
        }),
};
