import type { z } from 'zod';

/** Thrown when a content file does not match its schema. The message names the file and every bad field. */
export class ContentError extends Error {
  constructor(
    readonly file: string,
    readonly issues: { path: string; message: string }[],
  ) {
    super(
      `Invalid content in ${file}:\n` +
        issues.map((i) => `  - ${i.path || '(root)'}: ${i.message}`).join('\n'),
    );
    this.name = 'ContentError';
  }
}

/** Validate `data` (the parsed JSON of `file`) against `schema`; throw a ContentError on failure. */
export function parseContent<S extends z.ZodType>(file: string, schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ContentError(
    file,
    result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  );
}
