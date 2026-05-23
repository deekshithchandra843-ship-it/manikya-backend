/**
 * Manikya API Client
 * Place this file at: src/lib/api.ts
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const services = await api.services.getAll();
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ── Token helpers ─────────────────────────────────────────────
export const token = {
  getUser:  () => localStorage.getItem('manikya_user_token'),
  getAdmin: () => localStorage.getItem('manikya_admin_token'),
  setUser:  (t: string) => localStorage.setItem('manikya_user_token', t),
  setAdmin: (t: string) => localStorage.setItem('manikya_admin_token', t),
  clearUser:  () => localStorage.removeItem('manikya_user_token'),
  clearAdmin: () => { localStorage.removeItem('manikya_admin_token'); localStorage.removeItem('admin_logged_in'); },
};

// ── Core fetch wrapper ────────────────────────────────────────
async function req<T>(
  path: string,
  options: RequestInit = {},
  authType?: 'user' | 'admin'
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authType === 'user'  && token.getUser())  headers['Authorization'] = `Bearer ${token.getUser()}`;
  if (authType === 'admin' && token.getAdmin()) headers['Authorization'] = `Bearer ${token.getAdmin()}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

// ── Auth (public users) ───────────────────────────────────────
export const auth = {
  sendOTP: (method: 'email' | 'phone', identifier: string, type: 'otp' | 'magic_link' = 'otp') =>
    req<{ message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ method, identifier, type }),
    }),

  verifyOTP: async (identifier: string, otp: string) => {
    const data = await req<{ token: string; user: { id: string; name: string | null } }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ identifier, token: otp }) }
    );
    token.setUser(data.token);
    localStorage.setItem('user_logged_in', 'true');
    return data;
  },

  me: () => req<{ id: string; email: string; phone: string; name: string }>('/auth/me', {}, 'user'),

  logout: () => {
    token.clearUser();
    localStorage.removeItem('user_logged_in');
  },
};

// ── Admin auth ────────────────────────────────────────────────
export const adminAuth = {
  login: async (email: string, password: string) => {
    const data = await req<{ token: string; admin: { id: string; email: string; name: string } }>(
      '/admin/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    token.setAdmin(data.token);
    localStorage.setItem('admin_logged_in', 'true');
    return data;
  },

  me: () => req<{ id: string; email: string; name: string; last_login: string }>('/admin/me', {}, 'admin'),

  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ message: string }>('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, 'admin'),

  logout: () => token.clearAdmin(),
};

// ── Contact ───────────────────────────────────────────────────
export const contact = {
  submit: (data: { name: string; email?: string; phone?: string; interest?: string; message: string }) =>
    req<{ message: string; id: string }>('/contact', { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  getAll: () => req<ContactLead[]>('/contact', {}, 'admin'),
  updateStatus: (id: string, status: 'new' | 'contacted' | 'closed') =>
    req<{ message: string }>(`/contact/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'admin'),
  delete: (id: string) => req<{ message: string }>(`/contact/${id}`, { method: 'DELETE' }, 'admin'),
};

// ── Services ──────────────────────────────────────────────────
export const services = {
  getAll: () => req<Service[]>('/services'),
  getAllAdmin: () => req<Service[]>('/services/all', {}, 'admin'),
  create: (data: Omit<Service, 'id' | 'created_at' | 'updated_at'>) =>
    req<{ id: number; message: string }>('/services', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  update: (id: number, data: Partial<Service>) =>
    req<{ message: string }>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'admin'),
  delete: (id: number) => req<{ message: string }>(`/services/${id}`, { method: 'DELETE' }, 'admin'),
};

// ── Gallery ───────────────────────────────────────────────────
export const gallery = {
  getAll: () => req<GalleryItem[]>('/gallery'),
  getAllAdmin: () => req<GalleryItem[]>('/gallery/all', {}, 'admin'),
  create: (data: Omit<GalleryItem, 'id' | 'created_at' | 'updated_at'>) =>
    req<{ id: number; message: string }>('/gallery', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  updateImage: (id: number, image_data?: string, image_url?: string) =>
    req<{ message: string }>(`/gallery/${id}/image`, { method: 'PUT', body: JSON.stringify({ image_data, image_url }) }, 'admin'),
  update: (id: number, data: Partial<GalleryItem>) =>
    req<{ message: string }>(`/gallery/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'admin'),
  delete: (id: number) => req<{ message: string }>(`/gallery/${id}`, { method: 'DELETE' }, 'admin'),
};

// ── Products ──────────────────────────────────────────────────
export const products = {
  getAll: () => req<Product[]>('/products'),
  getAllAdmin: () => req<Product[]>('/products/all', {}, 'admin'),
  create: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) =>
    req<{ id: number; message: string }>('/products', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  update: (id: number, data: Partial<Product>) =>
    req<{ message: string }>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'admin'),
  delete: (id: number) => req<{ message: string }>(`/products/${id}`, { method: 'DELETE' }, 'admin'),
};

// ── Analytics ─────────────────────────────────────────────────
export const analytics = {
  logins: () => req<AnalyticsLogins>('/analytics/logins', {}, 'admin'),
  overview: () => req<AnalyticsOverview>('/analytics/overview', {}, 'admin'),
};

// ── Types ─────────────────────────────────────────────────────
export interface Service {
  id: number;
  title: string;
  description: string;
  icon?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContactLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  interest?: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  ip_address?: string;
  created_at: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  image_url?: string;
  image_data?: string;
  color: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  price?: number;
  image_url?: string;
  is_available?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AnalyticsLogins {
  attempts: Array<{
    id: string; method: string; type: string;
    identifier: string; status: string; created_at: string;
  }>;
  stats: Array<{ status: string; count: number }>;
  trend: Array<{ date: string; success: number; failed: number; pending: number }>;
}

export interface AnalyticsOverview {
  services: number;
  contacts: number;
  gallery: number;
  products: number;
  verified_users: number;
  new_leads: number;
}

export const api = { auth, adminAuth, contact, services, gallery, products, analytics };
export default api;
