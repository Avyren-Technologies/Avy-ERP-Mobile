const API_BASE = process.env.E2E_API_URL || 'http://localhost:3030/api/v1';

/**
 * Base API client for Detox E2E tests.
 * Uses native fetch (Node 18+). Module-specific clients extend this.
 */
export class BaseApiClient {
  private token: string = '';

  async login(email: string, password: string, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (body.success) {
        this.token = body.data.tokens.accessToken;
        return body.data;
      }
      if (body.code === 'DUPLICATE_ENTRY' && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw new Error(`Login failed: ${body.message || body.error}`);
    }
    throw new Error('Login failed after retries');
  }

  protected headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  async get(path: string, params?: Record<string, string>): Promise<any> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}${path}${qs}`, { headers: this.headers() });
    return res.json();
  }

  async post(path: string, data?: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  }

  async patch(path: string, data?: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  }

  async delete(path: string): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return res.json();
  }
}
