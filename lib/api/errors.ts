import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Custom API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Standard error response structure
 */
interface ErrorResponse {
  error: string;
  details?: unknown;
  field?: string;
}

/**
 * Handle API errors and return appropriate NextResponse
 *
 * @param error - The error to handle
 * @returns NextResponse with appropriate status code and error message
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  // Custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors,
        field: firstError?.path.join('.'),
      },
      { status: 400 }
    );
  }

  // Standard JavaScript errors
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Unknown error types
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Create a standardized success response
 *
 * @param data - The data to return
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

/**
 * Create a standardized error response
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Common API error responses
 */
export const errorResponses = {
  unauthorized: () => errorResponse('Unauthorized - Authentication required', 401),
  forbidden: (message = 'Forbidden - Insufficient permissions') =>
    errorResponse(message, 403),
  notFound: (resource = 'Resource') =>
    errorResponse(`${resource} not found`, 404),
  validationFailed: (details?: unknown) =>
    NextResponse.json(
      { error: 'Validation failed', details },
      { status: 400 }
    ),
  conflict: (message = 'Resource already exists') =>
    errorResponse(message, 409),
  tooManyRequests: () =>
    errorResponse('Too many requests - Please try again later', 429),
  serverError: (message = 'Internal server error') =>
    errorResponse(message, 500),
};
