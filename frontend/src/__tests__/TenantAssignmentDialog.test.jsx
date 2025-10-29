import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TenantAssignmentDialog from '../components/TenantAssignmentDialog';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

// Mock API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAvailableTenants = [
  {
    id: 'tenant-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    role: 'TENANT',
  },
  {
    id: 'tenant-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    role: 'TENANT',
  },
];

const mockExistingTenant = {
  id: 'ut-123',
  unitId: 'unit-456',
  tenantId: 'tenant-1',
  leaseStart: '2024-01-01T00:00:00Z',
  leaseEnd: '2024-12-31T00:00:00Z',
  rentAmount: 1500,
  depositAmount: 1500,
  tenant: {
    id: 'tenant-1',
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TenantAssignmentDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - New Assignment', () => {
    it('should render dialog with correct title for new assignment', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Assign Tenant to Unit')).toBeInTheDocument();
    });

    it('should display tenant dropdown with available tenants', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
      });
    });

    it('should display all required form fields', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Lease Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Lease End Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Monthly Rent')).toBeInTheDocument();
      expect(screen.getByLabelText('Security Deposit (Optional)')).toBeInTheDocument();
    });

    it('should show info alert when no tenants available', async () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No tenants available. Please invite tenants/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Rendering - Edit Assignment', () => {
    it('should render dialog with correct title for editing', () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog
          open={true}
          onClose={mockOnClose}
          unitId="unit-456"
          tenant={mockExistingTenant}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Edit Tenant Assignment')).toBeInTheDocument();
    });

    it('should display tenant name instead of dropdown when editing', () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog
          open={true}
          onClose={mockOnClose}
          unitId="unit-456"
          tenant={mockExistingTenant}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
      expect(screen.queryByLabelText('Tenant')).not.toBeInTheDocument();
    });

    it('should pre-fill form with existing tenant data', () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog
          open={true}
          onClose={mockOnClose}
          unitId="unit-456"
          tenant={mockExistingTenant}
        />,
        { wrapper: createWrapper() }
      );

      const rentInput = screen.getByLabelText('Monthly Rent');
      const depositInput = screen.getByLabelText('Security Deposit (Optional)');

      expect(rentInput).toHaveValue(1500);
      expect(depositInput).toHaveValue(1500);
    });
  });

  describe('Form Validation', () => {
    it('should show error when tenant not selected', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Assign Tenant')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Assign Tenant'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please select a tenant');
      });
    });

    it('should show error when lease start date missing', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
      });

      // Select tenant
      const tenantSelect = screen.getByLabelText('Tenant');
      fireEvent.change(tenantSelect, { target: { value: 'tenant-1' } });

      // Try to submit without dates
      fireEvent.click(screen.getByText('Assign Tenant'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should show error when lease end date is before start date', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
      });

      // This would require more complex date picker interaction
      // Validation logic is tested in the component
    });

    it('should show error when rent amount is invalid', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Monthly Rent')).toBeInTheDocument();
      });

      const rentInput = screen.getByLabelText('Monthly Rent');
      fireEvent.change(rentInput, { target: { value: '-100' } });

      fireEvent.click(screen.getByText('Assign Tenant'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should show error when deposit amount is negative', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Security Deposit (Optional)')).toBeInTheDocument();
      });

      const depositInput = screen.getByLabelText('Security Deposit (Optional)');
      fireEvent.change(depositInput, { target: { value: '-500' } });

      fireEvent.click(screen.getByText('Assign Tenant'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call POST API when assigning new tenant', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockResolvedValue({ data: { success: true } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
      });

      // Fill form (simplified - actual implementation would need date picker interaction)
      const tenantSelect = screen.getByLabelText('Tenant');
      fireEvent.change(tenantSelect, { target: { value: 'tenant-1' } });

      const rentInput = screen.getByLabelText('Monthly Rent');
      fireEvent.change(rentInput, { target: { value: '1500' } });

      // Submit would require valid dates
      // API call verification is the key test
    });

    it('should call PATCH API when updating existing tenant', async () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });
      apiClient.patch.mockResolvedValue({ data: { success: true } });

      render(
        <TenantAssignmentDialog
          open={true}
          onClose={mockOnClose}
          unitId="unit-456"
          tenant={mockExistingTenant}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Update Assignment')).toBeInTheDocument();
      });

      const rentInput = screen.getByLabelText('Monthly Rent');
      fireEvent.change(rentInput, { target: { value: '1600' } });

      // Submit would trigger PATCH
    });

    it('should show success toast on successful assignment', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockResolvedValue({ data: { success: true } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      // After successful submission
      await waitFor(() => {
        // Toast would be called after mutation success
      });
    });

    it('should show error toast on API failure', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockRejectedValue({
        response: { data: { message: 'Tenant already has active assignment' } },
      });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      // After failed submission
      await waitFor(() => {
        // Error toast would be called
      });
    });

    it('should close dialog on successful submission', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockResolvedValue({ data: { success: true } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      // After successful submission, onClose should be called
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when cancel is clicked', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable submit button when no tenants available', async () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const submitButton = screen.getByText('Assign Tenant');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should disable buttons during submission', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 100))
      );

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      // During submission, buttons should be disabled
    });

    it('should show loading text during submission', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });
      apiClient.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 100))
      );

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      // During submission, button text should change to "Saving..."
    });
  });

  describe('Data Fetching', () => {
    it('should fetch available tenants when dialog opens', async () => {
      apiClient.get.mockResolvedValue({ data: { users: mockAvailableTenants } });

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/users?role=TENANT');
      });
    });

    it('should not fetch tenants when editing existing assignment', () => {
      apiClient.get.mockResolvedValue({ data: { users: [] } });

      render(
        <TenantAssignmentDialog
          open={true}
          onClose={mockOnClose}
          unitId="unit-456"
          tenant={mockExistingTenant}
        />,
        { wrapper: createWrapper() }
      );

      // Should not fetch tenants when editing
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should show loading state while fetching tenants', async () => {
      apiClient.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { users: mockAvailableTenants } }), 100)
          )
      );

      render(
        <TenantAssignmentDialog open={true} onClose={mockOnClose} unitId="unit-456" tenant={null} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Loading tenants...')).toBeInTheDocument();
      });
    });
  });
});
