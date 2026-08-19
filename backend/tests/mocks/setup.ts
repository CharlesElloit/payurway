import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

jest.mock('../../src/config/redis', () => {
  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };
  return {
    __esModule: true,
    redis: redisMock,
    default: redisMock,
  };
});

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  captureError: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@sentry/node', () => ({
  __esModule: true,
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((cb: any) => cb({ setTag: jest.fn(), setUser: jest.fn(), setExtras: jest.fn() })),
  expressIntegration: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
  __esModule: true,
  notificationService: {
    createNotification: jest.fn(),
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  },
}));

jest.mock('../../src/services/carrierGateway', () => ({
  __esModule: true,
  carrierGatewayFactory: jest.fn(),
}));

import prisma from '../../src/config/database';
import { redis } from '../../src/config/redis';

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
export const redisMock = redis as unknown as {
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
};

export function resetMocks() {
  mockReset(prismaMock);
  Object.values(redisMock).forEach((fn) => fn.mockReset());
}

export async function expectThrows(
  fn: () => Promise<any>,
  statusCode: number,
  message?: string
) {
  try {
    await fn();
    throw new Error('Expected function to throw but it did not');
  } catch (err: any) {
    if (err.message === 'Expected function to throw but it did not') throw err;
    expect(err.statusCode).toBe(statusCode);
    if (message) expect(err.message).toBe(message);
  }
}
