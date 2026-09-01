/**
 * Typed API Client Helpers for SmartVault
 * Ensures consistent error handling and session credential inclusion.
 *
 * In local dev, VITE_API_BASE_URL is unset so all /api/* calls are
 * handled by the Vite proxy (localhost:8000).
 * In production (Vercel), set VITE_API_BASE_URL to the deployed backend URL,
 * e.g. https://smartvault-backend.vercel.app
 */

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    let errorMsg = 'An unexpected request error occurred.';
    try {
      errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map((e: any) => e.msg || 'Validation error').join(', ');
        }
      }
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new ApiError(response.status, errorMsg, errorData);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return {} as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(url: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });
  return handleResponse<T>(res);
}

export async function apiDownload(url: string, defaultFilename: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to download file');
  }

  const blob = await res.blob();
  let filename = defaultFilename;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const matches = disposition.match(/filename="?([^"]+)"?/);
    if (matches && matches[1]) {
      filename = matches[1];
    }
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
}
