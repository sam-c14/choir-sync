import axios from 'axios';
import { trackException } from './analytics';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status >= 500) {
      trackException(`API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${error.response.status}`, false);
    } else if (!error.response && error.message) {
      trackException(`Network/Timeout: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${error.message}`, false);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('user_profile');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh`, {
          token: refreshToken,
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);

        processQueue(null, res.data.token);

        originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        
        const status = refreshError.response?.status;
        // Only force logout on 4xx errors (invalid/expired refresh token).
        // 5xx errors or network timeouts should not clear the user's session.
        if (status && status >= 400 && status < 500) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('user_profile');
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };

/**
 * Safely extracts a user-friendly error message from any API error, Error object, or unknown exception.
 * Gracefully unpacks backend standardized payloads, Zod error arrays/details, and HTTP status fallbacks.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  // Axios or HTTP response error
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          message?: string | any;
          error?: string | any;
          details?: Array<{ field?: string; message: string }> | any;
        };
      };
      message?: string;
    };

    const data = axiosError.response?.data;
    if (data) {
      // 1. If message is a readable string
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
      }
      // 2. If error is a readable string
      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
      }
      // 3. If details is an array of issues
      if (Array.isArray(data.details) && data.details.length > 0) {
        const first = data.details[0];
        if (first?.message) return first.message;
      }
      // 4. If error was an array (e.g. raw Zod issues array)
      if (Array.isArray(data.error) && data.error.length > 0) {
        const first = data.error[0];
        if (first?.message) return first.message;
      }
    }

    // HTTP Status code heuristics if no server body message
    const status = axiosError.response?.status;
    if (status === 400) return 'Invalid request. Please check your input.';
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested item could not be found.';
    if (status === 409) return 'A conflict occurred. The item may already exist.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status && status >= 500) return 'Server error. Please try again later.';

    if (axiosError.message && typeof axiosError.message === 'string') {
      if (axiosError.message.toLowerCase().includes('network error')) {
        return 'Network error. Please check your internet connection.';
      }
      if (axiosError.message.toLowerCase().includes('timeout')) {
        return 'Request timed out. Please check your connection and try again.';
      }
    }
  }

  // Standard Error instance
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  // String error
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
}
