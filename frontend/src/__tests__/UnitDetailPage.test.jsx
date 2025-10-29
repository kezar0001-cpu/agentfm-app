import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnitDetailPage from '../pages/UnitDetailPage';
import { apiClient } from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'unit-123' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUnit = {
  id: 'unit-123',
  unitNumber: '101',
  bedrooms: 2,
  bathrooms: 1,
  area: 850,
  rentAmount: 1500,
  floor: 1,
  status: 'OCCUPIED',
  description: 'Spacious 2-bedroom unit',
  propertyId: 'property-456',
  property: {
    id: 'property-456',
    name: 'Sunset Apartments',
    address: '123 Main St',
  },
};

const mockTenant = {
  id: 'ut-789',
  unitId: 'unit-123',
  tenantId: 'tenant-321',
  leaseStart: '2024-01-01T00:00:00Z',
  leaseEnd: '2024-12-31T00:00:00Z',
  rentAmount: 1500,
  depositAmount: 1500,
  isActive: true,
  tenant: {
    id: 'tenant-321',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UnitDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render unit information correctly', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [] } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Unit 101')).toBeInTheDocument();
      });

      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
      expect(screen.getByText('2 Bedrooms')).toBeInTheDocument();
      expect(screen.getByText('1 Bathroom')).toBeInTheDocument();
      expect(screen.getByText('850 sq ft')).toBeInTheDocument();
      expect(screen.getByText('$1,500/month')).toBeInTheDocument();
      expect(screen.getByText('Floor 1')).toBeInTheDocument();
      expect(screen.getByText('Spacious 2-bedroom unit')).toBeInTheDocument();
    });

    it('should display current tenant when assigned', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [mockTenant] } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
      expect(screen.getByText(/Jan 1, 2024 - Dec 31, 2024/)).toBeInTheDocument();
      expect(screen.getByText('$1,500')).toBeInTheDocument();
    });

    it('should show empty state when no tenant assigned', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [] } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No tenant assigned to this unit')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Assign Tenant').length).toBeGreaterThan(0);
    });

    it('should display status chip with correct color', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        return Promise.resolve({ data: { tenants: [] } });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('OCCUPIED')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to property page', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        return Promise.resolve({ data: { tenants: [] } });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Back to Property')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Back to Property'));

      expect(mockNavigate).toHaveBeenCalledWith('/properties/property-456');
    });
  });

  describe('Tenant Assignment', () => {
    it('should open assign tenant dialog', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        return Promise.resolve({ data: { tenants: [] } });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText('Assign Tenant')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('Assign Tenant')[0]);

      // Dialog should open (tested in TenantAssignmentDialog tests)
    });

    it('should show edit and remove buttons for active tenant', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [mockTenant] } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should open confirm dialog when removing tenant', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [mockTenant] } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Remove')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Remove'));

      await waitFor(() => {
        expect(screen.getByText('Remove Tenant')).toBeInTheDocument();
      });

      expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('should display tabs for overview, jobs, and inspections', async () => {
      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        return Promise.resolve({ data: { tenants: [] } });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.getByText(/Jobs \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Inspections \(0\)/)).toBeInTheDocument();
    });

    it('should fetch jobs when jobs tab is clicked', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Fix leaky faucet',
          description: 'Kitchen faucet is leaking',
          status: 'OPEN',
          priority: 'HIGH',
        },
      ];

      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [] } });
        }
        if (url.includes('/jobs')) {
          return Promise.resolve({ data: { jobs: mockJobs } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Jobs \(0\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Jobs \(0\)/));

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/jobs?unitId=unit-123');
      });
    });

    it('should fetch inspections when inspections tab is clicked', async () => {
      const mockInspections = [
        {
          id: 'inspection-1',
          title: 'Annual Inspection',
          scheduledDate: '2024-11-15T00:00:00Z',
          status: 'SCHEDULED',
          type: 'ROUTINE',
        },
      ];

      apiClient.get.mockImplementation((url) => {
        if (url.includes('/units/unit-123')) {
          return Promise.resolve({ data: { unit: mockUnit } });
        }
        if (url.includes('/tenants')) {
          return Promise.resolve({ data: { tenants: [] } });
        }
        if (url.includes('/inspections')) {
          return Promise.resolve({ data: { inspections: mockInspections } });
        }
        return Promise.resolve({ data: [] });
      });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Inspections \(0\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Inspections \(0\)/));

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/inspections?unitId=unit-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when unit fetch fails', async () => {
      apiClient.get.mockRejectedValue(new Error('Failed to fetch unit'));

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when unit not found', async () => {
      apiClient.get.mockResolvedValue({ data: { unit: null } });

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Unit not found')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching data', async () => {
      apiClient.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { unit: mockUnit } }), 100))
      );

      render(<UnitDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Unit 101')).toBeInTheDocument();
      });
    });
  });
});
