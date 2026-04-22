/** @jest-environment node */

import { createApiError } from '../apiError';

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

describe('API Error Utilities', () => {
  describe('createApiError', () => {
    it('should create a standard error response', () => {
      const errorResponse = createApiError('NOT_FOUND');
      const { error } = errorResponse;

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(typeof error.requestId).toBe('string');
    });

    it('should allow a custom message', () => {
      const customMessage = 'The specific item you were looking for is gone.';
      const errorResponse = createApiError('NOT_FOUND', customMessage);
      expect(errorResponse.error.message).toBe(customMessage);
    });

    it('should not include details in production by default', () => {
      setNodeEnv('production');
      const errorResponse = createApiError('INTERNAL_ERROR', undefined, { sensitive: 'data' });
      expect(errorResponse.error.details).toBeUndefined();
      setNodeEnv('test');
    });

    it('should include details in development', () => {
      setNodeEnv('development');
      const details = { info: 'some debug info' };
      const errorResponse = createApiError('INTERNAL_ERROR', undefined, details);
      expect(errorResponse.error.details).toEqual(details);
      setNodeEnv('test');
    });

    it('should use the provided requestId', () => {
      const requestId = 'my-custom-request-id';
      const errorResponse = createApiError('UNAUTHORIZED', undefined, undefined, requestId);
      expect(errorResponse.error.requestId).toBe(requestId);
    });
  });
});
