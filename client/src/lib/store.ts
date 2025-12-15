import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Establishment, Sector, Measurement, MeasurementPoint, MeasurementType, Inspection, Client, Instrument } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  establishment: Establishment;
  sectors: Sector[];
  history: Inspection[];
  clients: Client[];
  availableInstruments: Instrument[];
  
  // Actions
  updateEstablishment: (data: Partial<Establishment>) => void;
  
  addSector: (sector: Omit<Sector, 'id' | 'measurements'>) => void;
  updateSector: (id: string, data: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
  
  addMeasurement: (sectorId: string, type: MeasurementType) => void;
  deleteMeasurement: (sectorId: string, measurementId: string) => void;
  updateMeasurement: (sectorId: string, measurementId: string, data: Partial<Measurement>) => void;
  
  addPoint: (sectorId: string, measurementId: string, pointData?: Partial<MeasurementPoint>) => void;
  updatePoint: (sectorId: string, measurementId: string, pointId: string, data: Partial<MeasurementPoint>) => void;
  deletePoint: (sectorId: string, measurementId: string, pointId: string) => void;
  
  saveInspection: () => void;
  loadInspection: (id: string) => void;
  deleteInspection: (id: string) => void;
  
  addSectorWithMeasurement: (sectorData: Omit<Sector, 'id' | 'measurements'>, type: MeasurementType) => void;

  // Instruments Actions
  addInstrument: (instrument: Instrument) => void;
  updateInstrument: (id: string, data: Partial<Instrument>) => void;
  deleteInstrument: (id: string) => void;

  // CRM Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  loadClientToEstablishment: (clientId: string) => void;

  resetStore: () => void;
}

const initialEstablishment: Establishment = {
  id: 'default',
  name: '',
  razonSocial: '',
  cuit: '',
  address: '',
  date: new Date().toISOString().split('T')[0],
  responsible: '',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      establishment: initialEstablishment,
      sectors: [],
      history: [],
      clients: [],
      availableInstruments: [
        {
          id: 'inst-1',
          type: 'thermal_load',
          brand: 'TES',
          model: '1639B',
          serialNumber: '130308165',
          calibrationCertificate: '22R4496',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-2',
          type: 'cold_stress',
          brand: 'EXTECH',
          model: 'SD700',
          serialNumber: 'A.070301',
          calibrationCertificate: '22R4500',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-3',
          type: 'cold_stress',
          brand: 'TESTO',
          model: '440',
          serialNumber: '81216382',
          calibrationCertificate: '22R4495',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-4',
          type: 'lighting',
          brand: 'TRIGGER',
          model: 'TG-531',
          serialNumber: '200807261',
          calibrationCertificate: '',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-5',
          type: 'generic',
          brand: 'FLUKE',
          model: '404D',
          serialNumber: '27910311',
          calibrationCertificate: '',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-6',
          type: 'noise',
          brand: 'TES',
          model: '1353 H',
          serialNumber: '130105756',
          calibrationCertificate: '22R4498',
          calibrationDate: '',
          attachedDocuments: {}
        },
        {
          id: 'inst-7',
          type: 'noise',
          brand: 'TES',
          model: '1355',
          serialNumber: '130807935',
          calibrationCertificate: '22R4497',
          calibrationDate: '',
          attachedDocuments: {}
        }
      ],

      addInstrument: (instrument) =>
        set((state) => ({
          availableInstruments: [...state.availableInstruments, instrument]
        })),

      updateInstrument: (id, data) =>
        set((state) => ({
          availableInstruments: state.availableInstruments.map((i) =>
            i.id === id ? { ...i, ...data } : i
          )
        })),

      deleteInstrument: (id) =>
        set((state) => ({
          availableInstruments: state.availableInstruments.filter((i) => i.id !== id)
        })),

      updateEstablishment: (data) => 
        set((state) => ({ establishment: { ...state.establishment, ...data } })),

      addSector: (sectorData) => 
        set((state) => ({
          sectors: [
            ...state.sectors,
            { ...sectorData, id: uuidv4(), measurements: [] }
          ]
        })),

      updateSector: (id, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => 
            s.id === id ? { ...s, ...data } : s
          )
        })),

      deleteSector: (id) =>
        set((state) => ({
          sectors: state.sectors.filter((s) => s.id !== id)
        })),

      addMeasurement: (sectorId, type) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: [
                ...s.measurements,
                {
                  id: uuidv4(),
                  type,
                  sectorId,
                  status: 'pending',
                  points: [],
                  observations: ''
                }
              ]
            };
          })
        })),

      deleteMeasurement: (sectorId, measurementId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.filter((m) => m.id !== measurementId)
            };
          })
        })),

      updateMeasurement: (sectorId, measurementId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => 
                m.id === measurementId ? { ...m, ...data } : m
              )
            };
          })
        })),

      addPoint: (sectorId, measurementId, pointData) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: [
                    ...m.points,
                    {
                      id: uuidv4(),
                      label: `Punto ${m.points.length + 1}`,
                      values: {},
                      ...pointData
                    }
                  ]
                };
              })
            };
          })
        })),

      updatePoint: (sectorId, measurementId, pointId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.map((p) => 
                    p.id === pointId ? { ...p, ...data } : p
                  )
                };
              })
            };
          })
        })),

      deletePoint: (sectorId, measurementId, pointId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.filter((p) => p.id !== pointId)
                };
              })
            };
          })
        })),

      saveInspection: () =>
        set((state) => ({
          history: [
            {
              id: uuidv4(),
              savedAt: new Date().toISOString(),
              establishment: JSON.parse(JSON.stringify(state.establishment)),
              sectors: JSON.parse(JSON.stringify(state.sectors))
            },
            ...state.history
          ]
        })),

      loadInspection: (id) =>
        set((state) => {
          const inspection = state.history.find((i) => i.id === id);
          if (!inspection) return state;
          return {
            establishment: JSON.parse(JSON.stringify(inspection.establishment)),
            sectors: JSON.parse(JSON.stringify(inspection.sectors))
          };
        }),

      deleteInspection: (id) =>
        set((state) => ({
          history: state.history.filter((i) => i.id !== id)
        })),

      addSectorWithMeasurement: (sectorData, type) => 
        set((state) => {
          const newSectorId = uuidv4();
          const newSector: Sector = {
            ...sectorData,
            id: newSectorId,
            measurements: [
              {
                id: uuidv4(),
                type,
                sectorId: newSectorId,
                status: 'pending',
                points: [],
                observations: ''
              }
            ]
          };
          return {
            sectors: [...state.sectors, newSector]
          };
        }),

      addClient: (clientData) =>
        set((state) => ({
          clients: [
            ...state.clients,
            { ...clientData, id: uuidv4(), createdAt: new Date().toISOString() }
          ]
        })),

      updateClient: (id, data) =>
        set((state) => ({
          clients: state.clients.map((c) => 
            c.id === id ? { ...c, ...data } : c
          )
        })),

      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id)
        })),
        
      loadClientToEstablishment: (clientId) =>
        set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;
          
          return {
            establishment: {
              ...state.establishment,
              name: client.name,
              razonSocial: client.razonSocial,
              cuit: client.cuit,
              address: client.address,
              city: client.city,
              province: client.province,
              postalCode: client.postalCode
            }
          };
        }),

      resetStore: () => set({ establishment: initialEstablishment, sectors: [] }),
    }),
    {
      name: 'syh-relevamiento-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
