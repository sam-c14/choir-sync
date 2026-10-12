import { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  code?: string;
  details?: Array<{ field?: string; message: string }> | any;
}

/**
 * Formats Zod validation issues into a single user-friendly string
 * and a structured details array.
 */
export function formatZodError(error: ZodError): {
  message: string;
  details: Array<{ field?: string; message: string }>;
} {
  const details = error.issues.map((issue) => {
    const field = issue.path.join('.');
    return {
      field: field || undefined,
      message: issue.message,
    };
  });

  const distinctMessages = Array.from(
    new Set(error.issues.map((i) => i.message).filter(Boolean))
  );

  const primaryMessage =
    distinctMessages.slice(0, 2).join('. ') || 'Validation failed';

  return { message: primaryMessage, details };
}

/**
 * Maps Prisma database error codes to clear, friendly user messages.
 */
export function formatPrismaError(error: any): {
  statusCode: number;
  message: string;
  code: string;
} {
  if (error?.code === 'P2002') {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : String(error.meta?.target || '');

    if (target.includes('email')) {
      return {
        statusCode: 409,
        message: 'An account with this email address already exists.',
        code: 'CONFLICT',
      };
    }
    if (target.includes('voicePart')) {
      return {
        statusCode: 409,
        message: 'Notes for this voice part already exist on this song.',
        code: 'CONFLICT',
      };
    }
    if (target.includes('playlist') && target.includes('song')) {
      return {
        statusCode: 409,
        message: 'This song is already in the playlist.',
        code: 'CONFLICT',
      };
    }
    return {
      statusCode: 409,
      message: 'A record with these details already exists.',
      code: 'CONFLICT',
    };
  }

  if (error?.code === 'P2025') {
    return {
      statusCode: 404,
      message: 'The requested record could not be found.',
      code: 'NOT_FOUND',
    };
  }

  if (error?.code === 'P2003') {
    return {
      statusCode: 409,
      message: 'Cannot complete this action because other records depend on it.',
      code: 'CONFLICT',
    };
  }

  return {
    statusCode: 500,
    message: 'An unexpected database error occurred.',
    code: 'DB_ERROR',
  };
}

/**
 * Standardized response sender ensuring both `error` and `message` properties
 * exist with the identical human-readable string.
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: any,
  code?: string
): Response {
  const payload: ApiErrorResponse = {
    error: message,
    message: message,
    statusCode,
  };
  if (code) payload.code = code;
  if (details !== undefined) payload.details = details;
  return res.status(statusCode).json(payload);
}

/**
 * Centralized error dispatcher for controller catch blocks.
 * Automatically handles ZodErrors, Prisma errors, custom service error objects, and standard Errors.
 */
export function handleControllerError(
  res: Response,
  error: any,
  fallbackMessage = 'An unexpected error occurred'
): Response {
  // Zod Validation Error
  if (error?.name === 'ZodError' || error instanceof ZodError) {
    const { message, details } = formatZodError(error);
    return sendError(res, 400, message, details, 'VALIDATION_ERROR');
  }

  // Prisma Database Error
  if (error?.code && typeof error.code === 'string' && error.code.startsWith('P2')) {
    const { statusCode, message, code } = formatPrismaError(error);
    return sendError(res, statusCode, message, undefined, code);
  }

  // Custom application error objects (e.g. { code: 'NOT_FOUND', message: '...' })
  if (error?.code === 'NOT_FOUND') {
    return sendError(res, 404, error.message || 'Not found', undefined, 'NOT_FOUND');
  }
  if (error?.code === 'FORBIDDEN') {
    return sendError(res, 403, error.message || 'Forbidden', undefined, 'FORBIDDEN');
  }
  if (error?.code === 'CONFLICT') {
    return sendError(res, 409, error.message || 'Conflict', undefined, 'CONFLICT');
  }

  // Standard Error instances
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    // Do not leak stack traces or internal filenames
    if (!msg.includes('\n') && msg.length < 150) {
      if (msg.toLowerCase().includes('not found')) {
        return sendError(res, 404, msg, undefined, 'NOT_FOUND');
      }
      if (
        msg.toLowerCase().includes('invalid email or password') ||
        msg.toLowerCase().includes('token') ||
        msg.toLowerCase().includes('unauthorized')
      ) {
        return sendError(res, 401, msg, undefined, 'UNAUTHORIZED');
      }
      if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('not authorized')) {
        return sendError(res, 403, msg, undefined, 'FORBIDDEN');
      }
      logger.error(error);
      return sendError(res, 500, msg, undefined, 'INTERNAL_ERROR');
    }
  }

  logger.error(error);
  return sendError(res, 500, fallbackMessage, undefined, 'INTERNAL_ERROR');
}
