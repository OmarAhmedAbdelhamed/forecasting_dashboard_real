import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * In-memory rate limiter for API routes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RateLimitPresets: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 60 * 1000 },
  passwordReset: { maxRequests: 3, windowMs: 15 * 60 * 1000 },
  standard: { maxRequests: 100, windowMs: 60 * 1000 },
  read: { maxRequests: 200, windowMs: 60 * 1000 },
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  isRateLimited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      windowStart: now,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      isRateLimited: false,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  const timeInWindow = now - entry.windowStart;

  if (timeInWindow >= config.windowMs) {
    entry.count = 1;
    entry.windowStart = now;
    entry.resetTime = now + config.windowMs;

    return {
      isRateLimited: false,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
      isRateLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    isRateLimited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * End rate limiter
 */

function getRequiredEnvVar(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = name === 'NEXT_PUBLIC_SUPABASE_URL'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      `Environment variable "${name}" is required but was not found. ` +
        'Please ensure it is set in your environment configuration.'
    );
  }
  return value;
}

/**
 * User role types matching the database
 */
type UserRole =
  | 'general_manager'
  | 'buyer'
  | 'inventory_planner'
  | 'regional_manager'
  | 'store_manager'
  | 'finance'
  | 'marketing'
  | 'production_planning';

/**
 * Dashboard section types
 */
type DashboardSection =
  | 'overview'
  | 'demand-forecasting'
  | 'inventory-planning'
  | 'pricing-promotion'
  | 'alert-center';

/**
 * Role configuration for section access control
 * Inline definition to avoid importing from types/permissions.ts which may use client-side features
 */
const ROLE_CONFIGS: Record<UserRole, { allowedSections: DashboardSection[] }> = {
  general_manager: {
    allowedSections: ['overview', 'demand-forecasting', 'pricing-promotion'],
  },
  buyer: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning'],
  },
  inventory_planner: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning', 'pricing-promotion'],
  },
  regional_manager: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning', 'pricing-promotion'],
  },
  store_manager: {
    allowedSections: ['overview', 'inventory-planning'],
  },
  finance: {
    allowedSections: ['overview', 'demand-forecasting', 'pricing-promotion'],
  },
  marketing: {
    allowedSections: ['overview', 'pricing-promotion'],
  },
  production_planning: {
    allowedSections: ['overview', 'demand-forecasting', 'inventory-planning'],
  },
};

/**
 * Maps URL path sections to their corresponding section identifiers
 */
function getSectionFromPathname(pathname: string): DashboardSection | null {
  // Extract section from /overview, /demand-forecasting, etc.
  const match = /^\/dashboard\/([^/]+)/.exec(pathname);
  if (!match) {return null;}

  const section = match[1] as DashboardSection;
  const validSections: DashboardSection[] = [
    'overview',
    'demand-forecasting',
    'inventory-planning',
    'pricing-promotion',
    'alert-center',
  ];

  return validSections.includes(section) ? section : null;
}

/**
 * Fetches user profile with role from Supabase
 */
async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        roles (
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !data?.roles?.name) {
      return null;
    }

    return data.roles.name as UserRole;
  } catch {
    return null;
  }
}

/**
 * Checks if a user's role has access to a specific section
 */
function hasSectionAccess(role: UserRole | null, section: DashboardSection): boolean {
  // User with no role can only access overview
  if (!role) {
    return section === 'overview';
  }

  const roleConfig = ROLE_CONFIGS[role];
  if (!roleConfig) {
    // Unknown role - default to overview only
    return section === 'overview';
  }

  return roleConfig.allowedSections.includes(section);
}

/**
 * Gets the first accessible section for a user's role
 * Returns overview as fallback for users with no role
 */
function getFirstAllowedSection(role: UserRole | null): DashboardSection {
  if (!role) {return 'overview';}

  const roleConfig = ROLE_CONFIGS[role];
  return roleConfig?.allowedSections[0] || 'overview';
}

/**
 * Proxy for route protection and authentication.
 *
 * This replaces the deprecated middleware.ts in Next.js 16+.
 *
 * Protected routes:
 * - /dashboard - Requires authentication and role-based section access
 *
 * Public routes:
 * - /auth/login - Public, but redirects to /dashboard if already authenticated
 * - / - Root page
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    let rateLimitConfig = RateLimitPresets.standard;

    // Apply stricter limits to auth endpoints
    if (pathname.includes('/auth/login')) {
      rateLimitConfig = RateLimitPresets.auth;
    } else if (pathname.includes('/reset-password')) {
      rateLimitConfig = RateLimitPresets.passwordReset;
    } else if (pathname.startsWith('/api/users/create')) {
      rateLimitConfig = RateLimitPresets.auth;
    } else if (pathname.startsWith('/api/users/') && request.method === 'GET') {
      rateLimitConfig = RateLimitPresets.read;
    }

    // Get identifier for rate limiting
    let identifier: string | null = null;

    // Try to get user ID from cookies (lightweight check, no full auth)
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      // For simplicity, use a hash of the token as identifier
      // In production, you'd decode the JWT to get the user ID
      identifier = `token:${accessToken.slice(0, 20)}`;
    }

    // Fall back to IP address
    if (!identifier) {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded
        ? forwarded.split(',')[0]?.trim()
        : request.headers.get('x-real-ip') || 'unknown';
      identifier = `ip:${ip}`;
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(identifier, rateLimitConfig);

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)));

    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        },
      );
    }
    // Continue processing the API request
  }

  const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' }) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: { path?: string }) {
          request.cookies.delete({
            name,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  // Get authenticated user - validates the JWT with the server for security
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Redirect authenticated users away from login page
  if (pathname === '/auth/login' && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Protect dashboard routes - require authentication
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Role-based access control for authenticated dashboard routes
  if (pathname.startsWith('/dashboard') && isAuthenticated && user?.id) {
    // Fetch user role from database
    const userRole = await getUserRole(supabase, user.id);

    // Special handling for /alert-center route
    if (pathname.startsWith('/dashboard/alert-center')) {
      if (!hasSectionAccess(userRole, 'alert-center')) {
        // User doesn't have alert_center permission - redirect to first allowed section
        const url = request.nextUrl.clone();
        const firstAllowed = getFirstAllowedSection(userRole);
        url.pathname = `/dashboard/${firstAllowed}`;
        return NextResponse.redirect(url);
      }
      // User has access - continue to alert-center
      return response;
    }

    // Extract section from pathname for other dashboard routes
    const section = getSectionFromPathname(pathname);

    // If we have a valid section, check access
    if (section && !hasSectionAccess(userRole, section)) {
      // User doesn't have access to this section
      // Redirect to first allowed section
      const url = request.nextUrl.clone();
      const firstAllowed = getFirstAllowedSection(userRole);
      url.pathname = `/dashboard/${firstAllowed}`;
      return NextResponse.redirect(url);
    }

    // If section is null (e.g., /dashboard without section), let the page handle it
    // User has access or no specific section to check - continue
  }

  return response;
}

/**
 * Configure which routes the proxy should run on.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
