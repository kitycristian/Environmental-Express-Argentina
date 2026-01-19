import { Client, Rubro, Instrument, Inspection } from './types';
import type { InsertRubro, InsertClient, InsertInstrument, InsertInspection } from '@shared/schema';

const API_BASE = '/api';

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ============= RUBROS API =============

export const rubrosApi = {
  getAll: () => apiCall<Rubro[]>('/rubros'),
  getById: (id: string) => apiCall<Rubro>(`/rubros/${id}`),
  create: (data: InsertRubro) => apiCall<Rubro>('/rubros', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<InsertRubro>) => apiCall<Rubro>(`/rubros/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall<void>(`/rubros/${id}`, {
    method: 'DELETE',
  }),
};

// ============= CLIENTS API =============

export const clientsApi = {
  getAll: () => apiCall<Client[]>('/clients'),
  getById: (id: string) => apiCall<Client>(`/clients/${id}`),
  create: (data: InsertClient) => apiCall<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<InsertClient>) => apiCall<Client>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall<void>(`/clients/${id}`, {
    method: 'DELETE',
  }),
};

// ============= INSTRUMENTS API =============

export const instrumentsApi = {
  getAll: () => apiCall<Instrument[]>('/instruments'),
  getById: (id: string) => apiCall<Instrument>(`/instruments/${id}`),
  create: (data: InsertInstrument) => apiCall<Instrument>('/instruments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<InsertInstrument>) => apiCall<Instrument>(`/instruments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall<void>(`/instruments/${id}`, {
    method: 'DELETE',
  }),
};

// ============= INSPECTIONS API =============

export const inspectionsApi = {
  getAll: () => apiCall<Inspection[]>('/inspections'),
  getById: (id: string) => apiCall<Inspection>(`/inspections/${id}`),
  create: (data: InsertInspection) => apiCall<Inspection>('/inspections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<InsertInspection>) => apiCall<Inspection>(`/inspections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall<void>(`/inspections/${id}`, {
    method: 'DELETE',
  }),
};
