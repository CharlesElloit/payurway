import { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, TooManyRequestsError, InternalError, CarrierError } from '../../src/utils/errors';

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('test', 400);
    expect(error.message).toBe('test');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create non-operational error', () => {
    const error = new AppError('critical', 500, false);
    expect(error.isOperational).toBe(false);
  });

  it('should create BadRequestError (400)', () => {
    const error = new BadRequestError('bad request');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('bad request');
  });

  it('should create UnauthorizedError (401)', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('should create ForbiddenError (403)', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });

  it('should create NotFoundError (404)', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
  });

  it('should create ConflictError (409)', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
  });

  it('should create TooManyRequestsError (429)', () => {
    const error = new TooManyRequestsError();
    expect(error.statusCode).toBe(429);
  });

  it('should create InternalError (500)', () => {
    const error = new InternalError();
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  it('should create CarrierError with carrier name', () => {
    const error = new CarrierError('mtn', 'API timeout');
    expect(error.statusCode).toBe(502);
    expect(error.carrier).toBe('mtn');
    expect(error.message).toContain('mtn');
    expect(error.message).toContain('API timeout');
  });

  it('should create CarrierError with custom status', () => {
    const error = new CarrierError('airtel', 'rate limited', 429);
    expect(error.statusCode).toBe(429);
  });
});
