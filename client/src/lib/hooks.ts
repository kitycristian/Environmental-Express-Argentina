import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rubrosApi, clientsApi, instrumentsApi, inspectionsApi } from './api';
import { toast } from 'sonner';
import type { InsertRubro, InsertClient, InsertInstrument, InsertInspection } from '@shared/schema';

// ============= RUBROS HOOKS =============

export function useRubros() {
  return useQuery({
    queryKey: ['rubros'],
    queryFn: rubrosApi.getAll,
  });
}

export function useCreateRubro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rubrosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubros'] });
      toast.success('Rubro creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateRubro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertRubro> }) =>
      rubrosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubros'] });
      toast.success('Rubro actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteRubro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rubrosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubros'] });
      toast.success('Rubro eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// ============= CLIENTS HOOKS =============

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertClient> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// ============= INSTRUMENTS HOOKS =============

export function useInstruments() {
  return useQuery({
    queryKey: ['instruments'],
    queryFn: instrumentsApi.getAll,
  });
}

export function useCreateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instrumentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      toast.success('Instrumento creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertInstrument> }) =>
      instrumentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      toast.success('Instrumento actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instrumentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      toast.success('Instrumento eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// ============= INSPECTIONS HOOKS =============

export function useInspections() {
  return useQuery({
    queryKey: ['inspections'],
    queryFn: inspectionsApi.getAll,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inspectionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspección guardada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertInspection> }) =>
      inspectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspección actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inspectionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspección eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
