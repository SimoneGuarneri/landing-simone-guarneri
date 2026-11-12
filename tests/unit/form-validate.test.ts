import { describe, expect, it } from 'vitest';
import { contactFields, validateField } from '../../src/lib/form/validate';

describe('contact form validation', () => {
  it('accepts a complete message with no phone', () => {
    const valid = { name: 'Mario Rossi', email: 'mario@example.com', phone: '', message: 'Ciao' };
    for (const field of contactFields) expect(validateField(field, valid[field]), field).toBeNull();
  });

  it('requires name, email and message (whitespace counts as empty)', () => {
    expect(validateField('name', '  ')).toBe('required');
    expect(validateField('email', '')).toBe('required');
    expect(validateField('message', '\n')).toBe('required');
    expect(validateField('phone', '')).toBeNull();
  });

  it('rejects a malformed email with the email error key', () => {
    for (const email of ['mario', 'mario@', '@example.com', 'mario@example', 'ma rio@example.com']) {
      expect(validateField('email', email), email).toBe('email');
    }
  });

  it('accepts a trimmed email and any optional phone', () => {
    expect(validateField('email', ' mario@example.com ')).toBeNull();
    expect(validateField('phone', '+39 333 1234567')).toBeNull();
  });

  it('only checks the email format on the email field', () => {
    expect(validateField('name', 'x@y')).toBeNull();
    expect(validateField('message', 'hi')).toBeNull();
  });
});
