import { expect } from 'vitest';

const isElement = (value) => {
  return value !== null && typeof value === 'object' && 'ownerDocument' in value;
};

expect.extend({
  toBeInTheDocument(received) {
    const pass = isElement(received) && received.ownerDocument?.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? 'Expected element not to be in the document'
          : 'Expected element to be found in the document',
    };
  },
  toHaveValue(received, expected) {
    const actual = received?.value;
    const pass = actual === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have value ${expected}`
          : `Expected ${expected} but received ${actual}`,
    };
  },
});

export {}; // Ensure module format is ESM

