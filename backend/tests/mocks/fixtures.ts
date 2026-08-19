export const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  phone: '+256771234567',
  passwordHash: '$2a$12$LJ3m4ys3Lz0YBNOURq0bVOT6Rj0rHd7kK2bVZ1V3K4xR5c6d7e8f9',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: null,
  isVerified: true,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockUnverifiedUser = {
  ...mockUser,
  id: 'user-uuid-2',
  isVerified: false,
};

export const mockAccount = {
  id: 'account-uuid-1',
  userId: 'user-uuid-1',
  phoneNumber: '+256771234567',
  carrier: 'mtn' as const,
  carrierAccountId: null,
  verificationStatus: 'verified' as const,
  encryptedPin: null,
  isDefault: true,
  isActive: true,
  verifiedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockPendingAccount = {
  ...mockAccount,
  id: 'account-uuid-2',
  verificationStatus: 'pending' as const,
  encryptedPin: null,
  verifiedAt: null,
};

export const mockPayment = {
  id: 'payment-uuid-1',
  reference: 'PMB-TEST-ABC123',
  amount: 50000,
  currency: 'UGX',
  description: 'Test payment',
  status: 'pending' as const,
  senderPhone: '+256771234567',
  receiverPhone: '+256759876543',
  senderId: 'user-uuid-1',
  receiverId: 'user-uuid-2',
  accountId: 'account-uuid-1',
  carrier: 'mtn' as const,
  carrierTransactionId: null,
  carrierResponse: null,
  qrCodeId: null,
  externalId: null,
  failureReason: null,
  completedAt: null,
  failedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockQRCode = {
  id: 'qr-uuid-1',
  userId: 'user-uuid-1',
  phone: '+256771234567',
  carrier: 'mtn' as const,
  amount: 50000,
  description: null,
  currency: 'UGX',
  signature: 'test-signature',
  isOneTime: true,
  isUsed: false,
  isActive: true,
  expiresAt: new Date(Date.now() + 600000),
  usedAt: null,
  createdAt: new Date('2024-01-01'),
};

export const mockNotification = {
  id: 'notif-uuid-1',
  userId: 'user-uuid-1',
  type: 'payment_received' as const,
  title: 'Payment Received',
  body: 'You received UGX 50,000',
  data: null,
  isRead: false,
  readAt: null,
  createdAt: new Date('2024-01-01'),
};

export const mockRefreshToken = {
  id: 'refresh-uuid-1',
  token: 'valid-refresh-token',
  userId: 'user-uuid-1',
  userAgent: 'test-agent',
  ipAddress: '127.0.0.1',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date('2024-01-01'),
};
