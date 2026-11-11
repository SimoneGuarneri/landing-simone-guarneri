import { describe, expect, it } from 'vitest';
import { validateContact, validateField } from '../../src/lib/form/validate';

const valid = { name: 'Mario Rossi', email: 'mario@example.com', phone: '', message: 'Ciao' };

describe('contact form validation', () => {
  it('accepts a complete message with no phone', () => {
    expect(validateContact(valid)).toEqual({});
  });

  it('requires name, email and message (whitespace counts as empty)', () => {
    expect(validateContact({ name: '  ', email: '', phone: '', message: '\n' })).toEqual({
      name: 'required',
      email: 'required',
      message: 'required',
    });
  });

  it('rejects a malformed email with the email error key', () => {
    for (const email of ['mario', 'mario@', '@example.com', 'mario@example', 'ma rio@example.com']) {
      expect(validateContact({ ...valid, email }), email).toEqual({ email: 'email' });
    }
  });

  it('accepts a trimmed email and any optional phone', () => {
    expect(validateContact({ ...valid, email: ' mario@example.com ', phone: '+39 333 1234567' })).toEqual({});
  });

  it('validates a single field for on-blur feedback', () => {
    expect(validateField('name', '')).toBe('required');
    expect(validateField('email', 'x@y')).toBe('email');
    expect(validateField('phone', '')).toBeNull();
    expect(validateField('message', 'hi')).toBeNull();
  });
});
