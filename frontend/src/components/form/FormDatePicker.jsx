import { Controller } from 'react-hook-form';
import { TextField } from '@mui/material';

/**
 * FormDatePicker - A reusable date picker component integrated with React Hook Form
 *
 * @param {object} props
 * @param {string} props.name - Field name for form registration
 * @param {object} props.control - React Hook Form control object
 * @param {string} props.label - Field label
 * @param {boolean} [props.required] - Whether field is required
 * @param {string} [props.helperText] - Additional helper text
 */
export default function FormDatePicker({
  name,
  control,
  label,
  required = false,
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
          type="date"
          label={label}
          required={required}
          error={!!error}
          helperText={error?.message || helperText}
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            'aria-invalid': !!error,
            'aria-describedby': error ? `${name}-error` : undefined,
          }}
          FormHelperTextProps={{
            id: error ? `${name}-error` : undefined,
            role: error ? 'alert' : undefined,
            'aria-live': error ? 'polite' : undefined,
          }}
        />
      )}
    />
  );
}
