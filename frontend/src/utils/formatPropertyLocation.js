const clean = (value) => {
  if (value == null) return '';
  if (typeof value !== 'string') return String(value);
  return value.trim();
};

const isPresent = (value) => clean(value).length > 0;

export const formatPropertyAddressLine = (property) => {
  if (!property) return '';

  const address = clean(property.address);
  const locality = [clean(property.city), clean(property.state)]
    .filter(isPresent)
    .join(', ');
  const postal = clean(property.zipCode);
  const country = clean(property.country);

  const parts = [address, [locality, postal].filter(isPresent).join(' '), country]
    .filter(isPresent)
    .map((part) => part.trim());

  return parts.join(', ');
};

export const formatPropertyLocality = (property) => {
  if (!property) return '';

  const locality = [clean(property.city), clean(property.state)]
    .filter(isPresent)
    .join(', ');
  const postal = clean(property.zipCode);
  const country = clean(property.country);

  const placeLine = [locality, postal].filter(isPresent).join(' ');

  return [placeLine, country]
    .filter(isPresent)
    .map((part) => part.trim())
    .join(', ');
};

export default formatPropertyAddressLine;
