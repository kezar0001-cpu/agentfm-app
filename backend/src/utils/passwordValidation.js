import zxcvbn from 'zxcvbn';

/**
 * Password Requirements:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - Minimum strength score of 3 (out of 4) from zxcvbn
 */

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MIN_STRENGTH = 3; // zxcvbn score (0-4)

/**
 * Validates password against all requirements
 * @param {string} password - The password to validate
 * @param {Array<string>} userInputs - Optional array of user inputs (email, name) to check for common patterns
 * @returns {Object} Validation result with detailed requirements
 */
export function validatePassword(password, userInputs = []) {
  const requirements = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };

  // Check zxcvbn strength
  const strengthResult = zxcvbn(password, userInputs);
  const strengthScore = strengthResult.score;
  requirements.minStrength = strengthScore >= PASSWORD_MIN_STRENGTH;

  // Calculate overall validity
  const isValid = Object.values(requirements).every(req => req === true);

  return {
    isValid,
    requirements,
    strength: {
      score: strengthScore,
      feedback: strengthResult.feedback,
      crackTimeDisplay: strengthResult.crack_times_display.offline_slow_hashing_1e4_per_second,
    },
  };
}

/**
 * Creates a custom Zod refinement for password validation
 * @param {Array<string>} userInputs - Optional array of user inputs to check against
 * @returns {Function} Zod refinement function
 */
export function createPasswordValidation(userInputs = []) {
  return (password) => {
    const result = validatePassword(password, userInputs);
    return result.isValid;
  };
}

/**
 * Generates a detailed error message for password validation failures
 * @param {Object} validationResult - Result from validatePassword
 * @returns {string} Human-readable error message
 */
export function getPasswordErrorMessage(validationResult) {
  const { requirements, strength } = validationResult;
  const failed = [];

  if (!requirements.minLength) {
    failed.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!requirements.hasUppercase) {
    failed.push('at least one uppercase letter');
  }
  if (!requirements.hasLowercase) {
    failed.push('at least one lowercase letter');
  }
  if (!requirements.hasNumber) {
    failed.push('at least one number');
  }
  if (!requirements.hasSpecialChar) {
    failed.push('at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?`~)');
  }
  if (!requirements.minStrength) {
    failed.push('stronger password (avoid common words and patterns)');
  }

  if (failed.length === 0) {
    return 'Password is valid';
  }

  return `Password must contain ${failed.join(', ')}.`;
}

/**
 * Validates password and throws an error if invalid
 * @param {string} password - The password to validate
 * @param {Array<string>} userInputs - Optional array of user inputs
 * @throws {Error} If password is invalid
 * @returns {Object} Validation result if valid
 */
export function validatePasswordOrThrow(password, userInputs = []) {
  const result = validatePassword(password, userInputs);
  if (!result.isValid) {
    const error = new Error(getPasswordErrorMessage(result));
    error.validationResult = result;
    throw error;
  }
  return result;
}
