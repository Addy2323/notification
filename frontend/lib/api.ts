const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || 'An unexpected error occurred';
    const error: any = new Error(errorMsg);
    error.code = data.error?.code || 'API_ERROR';
    error.status = response.status;
    throw error;
  }

  return data.data;
}
