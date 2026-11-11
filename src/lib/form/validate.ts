/**
 * Contact form validation. Pure: no DOM, shared by the client script and tests.
 * Error values are keys under `form.errors.*` in the copy files.
 */

export const contactFields = ['name', 'email', 'phone', 'message'] as const;
export type ContactField = (typeof contactFields)[number];
export type ContactValues = Record<ContactField, string>;
export type FieldError = 'required' | 'email';
export type ContactErrors = Partial<Record<ContactField, FieldError>>;

const required: ReadonlySet<ContactField> = new Set(['name', 'email', 'message']);
// Pragmatic check: one @, no spaces, a dot in the domain. The server is the real judge.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(field: ContactField, raw: string): FieldError | null {
  const value = raw.trim();
  if (value === '') return required.has(field) ? 'required' : null;
  if (field === 'email' && !EMAIL.test(value)) return 'email';
  return null;
}

/** Errors by field; an empty object means the values can be sent. */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of contactFields) {
    const error = validateField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
