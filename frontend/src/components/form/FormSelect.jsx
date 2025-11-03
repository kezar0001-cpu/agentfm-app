import { Controller } from 'react-hook-form';
import { TextField, MenuItem } from '@mui/material';

/**
 * FormSelect - A reusable select/dropdown component integrated with React Hook Form
 *
 * @param {object} props
 * @param {string} props.name - Field name for form registration
 * @param {object} props.control - React Hook Form control object
 * @param {string} props.label - Field label
 * @param {boolean} [props.required] - Whether field is required
 * @param {Array} props.options - Array of options, either strings or {value, label} objects
 * @param {string} [props.helperText] - Additional helper text
 */
export default function FormSelect({
  name,
  control,
  label,
  required = false,
  options = [],
  helperText,
  ...rest
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...rest}
          fullWidth
          select
          label={label}
          required={required}
          error={!!error}
          helperText={error?.message || helperText}
          SelectProps={{
            'aria-invalid': !!error,
            'aria-describedby': error ? `${name}-error` : undefined,
          }}
          FormHelperTextProps={{
            id: error ? `${name}-error` : undefined,
            role: error ? 'alert' : undefined,
            'aria-live': error ? 'polite' : undefined,
          }}
        >
          {options.map((option) => {
            // Handle both string options and {value, label} object options
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;

            return (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            );
          })}
        </TextField>
      )}
    />
  );
}
