import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportGenerator from '../pages/ReportGenerator';
import { apiClient } from '../api/client';

jest.mock('../api/client');

const queryClient = new QueryClient();

const renderComponent = (reportType) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/reports/${reportType}`]}>
        <Routes>
          <Route path="/reports/:reportType" element={<ReportGenerator />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ReportGenerator', () => {
  beforeEach(() => {
    apiClient.get.mockResolvedValue({ data: { items: [] } });
    apiClient.post.mockResolvedValue({ data: { success: true } });
  });

  it('renders the correct form fields for a Financial report', () => {
    renderComponent('Financial');

    expect(screen.getByLabelText('Property')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.queryByLabelText('Unit (Optional)')).not.toBeInTheDocument();
  });

  it('renders the correct form fields for a Maintenance report', () => {
    renderComponent('Maintenance');

    expect(screen.getByLabelText('Property')).toBeInTheDocument();
    expect(screen.getByLabelText('Unit (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('submits the form with the correct data', async () => {
    renderComponent('Financial');

    fireEvent.change(screen.getByLabelText('Property'), { target: { value: 'prop1' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2023-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2023-01-31' } });

    fireEvent.click(screen.getByText('Generate Report'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/new-reports/financial', {
        propertyId: 'prop1',
        fromDate: '2023-01-01T00:00:00.000Z',
        toDate: '2023-01-31T00:00:00.000Z',
      });
    });
  });
});
