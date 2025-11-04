import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NewReportsPage from '../pages/NewReportsPage';

describe('NewReportsPage', () => {
  it('renders the report cards', () => {
    render(
      <BrowserRouter>
        <NewReportsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    expect(screen.getByText('Occupancy Reports')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Reports')).toBeInTheDocument();
    expect(screen.getByText('Tenant Reports')).toBeInTheDocument();
  });

  it('navigates to the correct report generator page when a card is clicked', () => {
    const { container } = render(
      <BrowserRouter>
        <NewReportsPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Financial Reports'));
    expect(window.location.pathname).toBe('/reports/Financial');
  });
});
