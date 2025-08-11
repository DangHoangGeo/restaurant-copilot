import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { randomUUID } from 'crypto';
import { getUserFromRequest, AuthUser } from './getUserFromRequest';
import { checkAuthorization, RolePermissions } from './rolePermissions';
import { protectEndpoint, RATE_LIMIT_CONFIGS, RateLimitConfig } from './rateLimit';
import { handleApiError } from './apiError';

// Define the context that will be passed to the API logic
export interface ApiHandlerContext<T = unknown> {
  req: NextRequest;
  user: AuthUser;
  validatedData: T;
  requestId: string;
  params: Record<string, string>;
}

// Define the actual API logic function signature
type ApiLogic<T = unknown> = (context: ApiHandlerContext<T>) => Promise<NextResponse>;

// Define the options for the handler creator
export interface ApiHandlerOptions<T extends ZodSchema> {
  schema?: T;
  resource: keyof RolePermissions;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  rateLimitConfig?: RateLimitConfig;
}

// Type for Next.js route context (compatible with Next.js 15)
type RouteContext = {
  params: Promise<Record<string, string>>;
};

export function createApiHandler<T extends ZodSchema>(
  options: ApiHandlerOptions<T>,
  logic: ApiLogic<z.infer<T>>
) {
  return async (req: NextRequest, context: RouteContext = { params: Promise.resolve({}) }): Promise<NextResponse> => {
    const requestId = randomUUID();
    let user: AuthUser | null = null;
    
    // Handle params - they will be a Promise (Next.js 15)
    const params: Record<string, string> = await context.params;

    try {
      // 1. Rate Limiting & CSRF Protection
      const method = req.method.toUpperCase();
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const rateLimitConfig = options.rateLimitConfig || (isMutation ? RATE_LIMIT_CONFIGS.MUTATION : RATE_LIMIT_CONFIGS.QUERY);

      const protectionError = await protectEndpoint(req, rateLimitConfig, options.resource, requestId);
      if (protectionError) {
        return protectionError;
      }

      // 2. Authentication
      user = await getUserFromRequest();
      if (!user || !user.restaurantId) {
        return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
      }

      // 3. Authorization
      const authError = checkAuthorization(user, options.resource, options.operation);
      if (authError) {
        return authError;
      }

      // 4. Validation
      let validatedData: z.infer<T> | undefined;
      // For GET requests, we don't parse a body, so schema validation is skipped unless explicitly needed for query params (future enhancement)
      if (isMutation && options.schema) {
        const body = await req.json();
        const validationResult = options.schema.safeParse(body);
        if (!validationResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                requestId,
                details: validationResult.error.flatten().fieldErrors,
              },
            },
            { status: 400 }
          );
        }
        validatedData = validationResult.data;
      }

      // 5. Execute API Logic
      const context: ApiHandlerContext<z.infer<T>> = {
        req,
        user,
        validatedData: validatedData as z.infer<T>,
        requestId,
        params,
      };

      return await logic(context);

    } catch (error) {
      return await handleApiError(
        error,
        `${options.resource}-${options.operation.toLowerCase()}`,
        user?.restaurantId || undefined,
        user?.userId,
        requestId
      );
    }
  };
}
