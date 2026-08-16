import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../../src/middleware/auth';
import { config } from '../../src/config';
import { UnauthorizedError } from '../../src/utils/errors';

const mockUser = { id: 'user-1', email: 'test@example.com', phone: '+256771234567' };

function createMockRequest(authHeader?: string): Request {
  return {
    headers: {
      authorization: authHeader,
    },
  } as unknown as Request;
}

function createMockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

const nextFn = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Middleware', () => {
  describe('authenticate', () => {
    it('should call next with user for valid token', () => {
      const token = jwt.sign(mockUser, config.jwt.secret, { expiresIn: '1h' });
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();

      authenticate(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
      expect((req as any).user).toBeDefined();
      expect((req as any).user.id).toBe('user-1');
    });

    it('should call next with UnauthorizedError if no token', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      authenticate(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.message).toBe('No token provided');
    });

    it('should call next with UnauthorizedError for invalid token', () => {
      const req = createMockRequest('Bearer invalid-token');
      const res = createMockResponse();

      authenticate(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.message).toBe('Invalid token');
    });

    it('should call next with UnauthorizedError for expired token', () => {
      const token = jwt.sign(mockUser, config.jwt.secret, { expiresIn: '0s' });
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();

      authenticate(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.message).toBe('Token expired');
    });

    it('should call next with UnauthorizedError for non-Bearer token', () => {
      const req = createMockRequest('Basic some-credentials');
      const res = createMockResponse();

      authenticate(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      const err = nextFn.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.message).toBe('No token provided');
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', () => {
      const token = jwt.sign(mockUser, config.jwt.secret, { expiresIn: '1h' });
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();

      optionalAuth(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
      expect((req as any).user).toBeDefined();
    });

    it('should call next without user if no token', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      optionalAuth(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
      expect((req as any).user).toBeUndefined();
    });

    it('should call next without user for invalid token', () => {
      const req = createMockRequest('Bearer bad-token');
      const res = createMockResponse();

      optionalAuth(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
      expect((req as any).user).toBeUndefined();
    });
  });
});
