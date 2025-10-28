export function calculateDaysRemaining(endDateString) {
  if (!endDateString) return null;

  const endDate = new Date(endDateString);
  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  const now = new Date();
  // Set to the end of the day to be inclusive
  endDate.setHours(23, 59, 59, 999);
  const diffTime = endDate.getTime() - now.getTime();
  if (diffTime < 0) return 0; // Trial has expired
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
