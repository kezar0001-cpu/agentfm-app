import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ServiceRequestDetailModal from '../components/ServiceRequestDetailModal';
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

const mockServiceRequest = {
  id: 'sr-123',
  title: 'Leaky Faucet in Kitchen',
  description: 'The kitchen faucet has been leaking for 3 days. Water is dripping constantly even when fully closed.',
  category: 'PLUMBING',
  priority: 'HIGH',
  status: 'SUBMITTED',
  photos: [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
  ],
  reviewNotes: null,
  reviewedAt: null,
  createdAt: '2024-10-28T14:30:00Z',
  updatedAt: '2024-10-28T14:30:00Z',
  property: {
    id: 'prop-456',
    name: 'Sunset Apartments',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
  },
  unit: {
    id: 'unit-789',
    unitNumber: '101',
  },
  requestedBy: {
    id: 'user-321',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
  },
  jobs: [],
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

describe('ServiceRequestDetailModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with request details', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Leaky Faucet in Kitchen')).toBeInTheDocument();
      });

      expect(screen.getByText(/The kitchen faucet has been leaking/)).toBeInTheDocument();
    });

    it('should display full description (not truncated)', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const description = screen.getByText(/The kitchen faucet has been leaking/);
        expect(description.textContent).toContain('fully closed');
      });
    });

    it('should show photo gallery', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Photos (2)')).toBeInTheDocument();
      });

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(2);
    });

    it('should display property and unit information', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Sunset Apartments/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Unit 101/)).toBeInTheDocument();
    });

    it('should show requester details', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
    });

    it('should display status and category chips', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      });

      expect(screen.getByText('PLUMBING')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  describe('Review History', () => {
    it('should display review history when available', async () => {
      const requestWithReview = {
        ...mockServiceRequest,
        status: 'APPROVED',
        reviewNotes: 'Approved - urgent repair needed',
        reviewedAt: '2024-10-28T15:15:00Z',
      };

      apiClient.get.mockResolvedValue({
        data: { success: true, request: requestWithReview },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Review History')).toBeInTheDocument();
      });

      expect(screen.getByText('Approved - urgent repair needed')).toBeInTheDocument();
    });

    it('should not show review section when no review exists', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Leaky Faucet in Kitchen')).toBeInTheDocument();
      });

      expect(screen.queryByText('Review History')).not.toBeInTheDocument();
    });
  });

  describe('Converted Jobs', () => {
    it('should show converted jobs list', async () => {
      const requestWithJobs = {
        ...mockServiceRequest,
        status: 'CONVERTED_TO_JOB',
        jobs: [
          {
            id: 'job-999',
            title: 'Fix Kitchen Faucet Leak',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            createdAt: '2024-10-28T15:20:00Z',
          },
        ],
      };

      apiClient.get.mockResolvedValue({
        data: { success: true, request: requestWithJobs },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Converted Jobs')).toBeInTheDocument();
      });

      expect(screen.getByText('Fix Kitchen Faucet Leak')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    });

    it('should not show jobs section when no jobs exist', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Leaky Faucet in Kitchen')).toBeInTheDocument();
      });

      expect(screen.queryByText('Converted Jobs')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should show approve and reject buttons for submitted requests', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should show convert to job button for approved requests', async () => {
      const approvedRequest = {
        ...mockServiceRequest,
        status: 'APPROVED',
      };

      apiClient.get.mockResolvedValue({
        data: { success: true, request: approvedRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Convert to Job')).toBeInTheDocument();
      });
    });

    it('should open review input when approve is clicked', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Approve'));

      await waitFor(() => {
        expect(screen.getByText('Approve Request')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Review Notes')).toBeInTheDocument();
    });

    it('should open review input when reject is clicked', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Reject'));

      await waitFor(() => {
        expect(screen.getByText('Reject Request')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Review Notes')).toBeInTheDocument();
    });

    it('should call API when approving request', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });
      apiClient.patch.mockResolvedValue({ data: { success: true } });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Approve'));

      await waitFor(() => {
        expect(screen.getByLabelText('Review Notes')).toBeInTheDocument();
      });

      const notesInput = screen.getByLabelText('Review Notes');
      fireEvent.change(notesInput, { target: { value: 'Approved - urgent' } });

      const submitButton = screen.getAllByText('Approve').find(btn => 
        btn.closest('button')?.type === 'button'
      );
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/service-requests/sr-123', {
          status: 'APPROVED',
          reviewNotes: 'Approved - urgent',
        });
      });
    });

    it('should call API when converting to job', async () => {
      const approvedRequest = {
        ...mockServiceRequest,
        status: 'APPROVED',
      };

      apiClient.get.mockResolvedValue({
        data: { success: true, request: approvedRequest },
      });
      apiClient.post.mockResolvedValue({ data: { success: true } });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Convert to Job')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Convert to Job'));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/service-requests/sr-123/convert-to-job');
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', async () => {
      apiClient.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { request: mockServiceRequest } }), 100))
      );

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error state', async () => {
      apiClient.get.mockRejectedValue(new Error('Failed to fetch'));

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no data', async () => {
      apiClient.get.mockResolvedValue({ data: { request: null } });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when close button is clicked', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Leaky Faucet in Kitchen')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not fetch data when modal is closed', () => {
      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={false}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch data when modal opens', async () => {
      apiClient.get.mockResolvedValue({
        data: { success: true, request: mockServiceRequest },
      });

      render(
        <ServiceRequestDetailModal
          requestId="sr-123"
          open={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/service-requests/sr-123');
      });
    });
  });
});
