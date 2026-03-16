/**
 * eAttend API Client
 * Handles all communication with the Django REST Framework backend.
 */

const API_BASE = '/api';

function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.split('=');
        if (key === name) {
            return decodeURIComponent(valueParts.join('='));
        }
    }
    return null;
}

const Auth = {
    getAccessToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),

    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    }
};

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const csrfToken = getCookie('csrftoken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }

    const token = Auth.getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers, credentials: 'same-origin' });

    // Try token refresh on 401
    if (response.status === 401 && Auth.getRefreshToken()) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            headers['Authorization'] = `Bearer ${Auth.getAccessToken()}`;
            response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
        } else {
            Auth.clearTokens();
            window.location.href = '/login/';
            return;
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(extractErrorMessage(errorData));
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function tryRefreshToken() {
    const refresh = Auth.getRefreshToken();
    if (!refresh) return false;
    try {
        const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        if (res.ok) {
            const data = await res.json();
            Auth.setTokens(data.access, data.refresh);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function extractErrorMessage(data) {
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.non_field_errors) return data.non_field_errors.join(' ');
    const messages = [];
    for (const [key, value] of Object.entries(data)) {
        const msg = Array.isArray(value) ? value.join(' ') : String(value);
        messages.push(`${key}: ${msg}`);
    }
    return messages.join('\n') || 'An error occurred.';
}

// ===== API METHODS =====

const API = {
    // Auth
    register: (payload) =>
        apiFetch('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    login: (username, password) =>
        apiFetch('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    logout: () =>
        apiFetch('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh: Auth.getRefreshToken() }),
        }),

    getCurrentUser: () => apiFetch('/auth/me/'),

    updateProfile: (data) =>
        apiFetch('/auth/me/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    changePassword: (oldPassword, newPassword) =>
        apiFetch('/auth/change-password/', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        }),

    // Users (manager)
    getUsers: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/auth/users/${qs ? '?' + qs : ''}`);
    },

    createUser: (data) =>
        apiFetch('/auth/users/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Attendance
    timeIn: (notes = '') =>
        apiFetch('/attendance/time-in/', {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    timeOut: (notes = '') =>
        apiFetch('/attendance/time-out/', {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    getTodayAttendance: () => apiFetch('/attendance/today/'),

    getMyAttendance: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/attendance/my/${qs ? '?' + qs : ''}`);
    },

    getMyAttendanceSummary: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/attendance/my/summary/${qs ? '?' + qs : ''}`);
    },

    getAllAttendance: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/attendance/all/${qs ? '?' + qs : ''}`);
    },

    // Leaves
    getMyLeaves: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/leaves/my/${qs ? '?' + qs : ''}`);
    },

    submitLeave: (data) =>
        apiFetch('/leaves/my/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    cancelLeave: (id) =>
        apiFetch(`/leaves/my/${id}/`, { method: 'DELETE' }),

    getAllLeaves: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/leaves/all/${qs ? '?' + qs : ''}`);
    },

    reviewLeave: (id, status, comment) =>
        apiFetch(`/leaves/${id}/review/`, {
            method: 'POST',
            body: JSON.stringify({ status, review_comment: comment }),
        }),

    getDashboardSummary: () => apiFetch('/leaves/dashboard/'),
};
