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
