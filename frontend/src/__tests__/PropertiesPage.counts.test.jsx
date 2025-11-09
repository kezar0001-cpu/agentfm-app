import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import PropertiesPage from '../pages/PropertiesPage.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { changeLanguage: () => Promise.resolve() } }),
}));

vi.mock('../components/PropertyOnboardingWizard.jsx', () => ({ default: () => null }));
vi.mock('../components/PropertyForm.jsx', () => ({ default: () => null }));
vi.mock('../components/PropertyOccupancyWidget.jsx', () => ({ default: () => null }));

const { mockedGet, mockedDelete, mockedRequest } = vi.hoisted(() => ({
  mockedGet: vi.fn(),
  mockedDelete: vi.fn(),
  mockedRequest: vi.fn(),
}));

vi.mock('../api/client', () => {
  const client = {
    get: mockedGet,
    delete: mockedDelete,
    request: mockedRequest,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return { __esModule: true, default: client, apiClient: client };
});

describe('PropertiesPage counts display', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedDelete.mockReset();
    mockedRequest.mockReset();
    cleanup();
  });

  it('renders zero counts when jobs or inspections are missing', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'property-1',
            name: 'Harbour View',
            address: '123 Waterfront Ave',
            city: 'Sydney',
            state: 'NSW',
            zipCode: '2000',
            country: 'Australia',
            propertyType: 'Residential',
            status: 'ACTIVE',
            totalUnits: 12,
            totalArea: null,
            yearBuilt: 2015,
            managerId: 'manager-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            _count: {
              units: 12,
            },
          },
        ],
        total: 1,
        page: 1,
        hasMore: false,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PropertiesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('0 active jobs • 0 inspections')).toBeInTheDocument();
    });
  });

  it('renders occupancy stats when provided in property response', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'property-2',
            name: 'Sunset Apartments',
            address: '456 Beach Road',
            city: 'Miami',
            state: 'FL',
            zipCode: '33139',
            country: 'United States',
            propertyType: 'Residential',
            status: 'ACTIVE',
            totalUnits: 10,
            totalArea: 5000,
            yearBuilt: 2020,
            managerId: 'manager-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            _count: {
              units: 10,
              jobs: 3,
              inspections: 2,
            },
            occupancyStats: {
              occupied: 7,
              vacant: 2,
              maintenance: 1,
              total: 10,
              occupancyRate: 70.0,
            },
          },
        ],
        total: 1,
        page: 1,
        hasMore: false,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PropertiesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
      expect(screen.getByText('3 active jobs • 2 inspections')).toBeInTheDocument();
    });
  });
});
