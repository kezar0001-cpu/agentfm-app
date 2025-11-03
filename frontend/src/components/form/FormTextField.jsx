import { Controller } from 'react-hook-form';
import { TextField } from '@mui/material';

/**
 * FormTextField - A reusable text field component integrated with React Hook Form
 *
 * @param {object} props
 * @param {string} props.name - Field name for form registration
 * @param {object} props.control - React Hook Form control object
 * @param {string} props.label - Field label
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.multiline] - Whether to show multiline textarea
 * @param {number} [props.rows] - Number of rows for multiline
 * @param {string} [props.type] - Input type (text, number, email, etc.)
 * @param {string} [props.helperText] - Additional helper text
 * @param {object} [props.inputProps] - Additional input props
 */
export default function FormTextField({
  name,
  control,
  label,
  required = false,
  multiline = false,
  rows,
  type = 'text',
  helperText,
  inputProps,
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
          label={label}
          required={required}
          multiline={multiline}
          rows={rows}
          type={type}
          error={!!error}
          helperText={error?.message || helperText}
          inputProps={{
            'aria-invalid': !!error,
            'aria-describedby': error ? `${name}-error` : undefined,
            ...inputProps,
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
