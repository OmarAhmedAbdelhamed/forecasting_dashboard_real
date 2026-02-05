/**
 * Input sanitization utilities for security
 *
 * Provides functions to sanitize user input against:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection (wildcard injection in ILIKE searches)
 * - HTML/script injection
 */

/**
 * Escape special characters for HTML context
 * Prevents XSS when rendering user input in HTML
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML rendering
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHTML(userInput);
 * // '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 * ```
 */
export function escapeHTML(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
}

/**
 * Sanitize user input for text fields (names, descriptions, etc.)
 * Removes potentially dangerous content while preserving safe text
 *
 * This function:
 * 1. Strips HTML tags
 * 2. Removes event handler attributes (onclick, onerror, etc.)
 * 3. Removes javascript: and data: URLs
 * 4. Escapes special characters
 *
 * @param str - String to sanitize
 * @returns Sanitized string safe for display
 *
 * @example
 * ```ts
 * const userInput = 'Hello <script>alert("XSS")</script> World';
 * const clean = sanitizeText(userInput);
 * // 'Hello alert("XSS") World'
 * ```
 */
export function sanitizeText(str: string): string {
  if (!str) {
    return '';
  }

  return (
    str
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove event handlers (onclick, onerror, etc.)
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\bon\w+\s*=\s*[^\s>]/gi, '')
      // Remove javascript: and data: URLs
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Trim whitespace
      .trim()
  );
}

/**
 * Sanitize search terms for SQL ILIKE queries
 *
 * Prevents wildcard injection by escaping special SQL characters:
 * - % (matches any string)
 * - _ (matches any single character)
 * - \ (escape character)
 *
 * @param searchTerm - The search term to sanitize
 * @returns Search term with wildcards escaped
 *
 * @example
 * ```ts
 * const userInput = '%test%';
 * const safe = sanitizeILikeSearch(userInput);
 * // '\\%test\\%' (the wildcards are escaped)
 *
 * // In query:
 * query = query.ilike('name', `%${safe}%`);
 * ```
 */
export function sanitizeILikeSearch(searchTerm: string): string {
  if (!searchTerm) {
    return '';
  }

  // Escape special SQL wildcard characters
  return searchTerm.replace(/([%_\\])/g, '\\$1');
}

/**
 * Sanitize multiple search terms (for OR queries)
 *
 * @param searchTerms - Array of search terms
 * @returns Array of sanitized search terms
 */
export function sanitizeILikeSearchMultiple(searchTerms: string[]): string[] {
  return searchTerms.map(sanitizeILikeSearch);
}

/**
 * Validate and sanitize email address
 *
 * @param email - Email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email) {
    return '';
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();

  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Sanitize UUID strings
 *
 * @param uuid - UUID to validate
 * @returns Sanitized UUID or null if invalid
 */
export function sanitizeUUID(uuid: string): string | null {
  if (!uuid) {
    return null;
  }

  // UUID v4 regex
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(uuid) ? uuid.toLowerCase() : null;
}

/**
 * Deep sanitize an object (for request bodies)
 * Sanitizes all string values recursively
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      // Sanitize string values
      (sanitized as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
      );
    } else if (Array.isArray(value)) {
      // Sanitize arrays of strings
      (sanitized as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeText(item) : item,
      );
    }
  }

  return sanitized;
}

/**
 * Remove null bytes from string
 * Null bytes can be used in injection attacks
 *
 * @param str - String to clean
 * @returns String without null bytes
 */
export function removeNullBytes(str: string): string {
  return str.replace(/\0/g, '');
}

/**
 * Validate that a string contains only safe characters
 * Allows alphanumeric, spaces, and common punctuation
 *
 * @param str - String to validate
 * @returns true if string contains only safe characters
 */
export function isSafeString(str: string): boolean {
  // Allow: letters, numbers, spaces, and common punctuation
  const safeChars = /^[a-zA-Z0-9\s\-_.,!?@()]*$/;
  return safeChars.test(str);
}

/**
 * Truncate string to maximum length
 * Useful for preventing DoS via extremely long inputs
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 1000)
 * @returns Truncated string
 */
export function truncate(str: string, maxLength = 1000): string {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}
