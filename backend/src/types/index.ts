import { Request } from 'express';

export interface AuthUser {
  id: string;
  email?: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export type Carrier = 'mtn' | 'airtel';

export type PaymentStatus = 'pending' | 'processing' | 'requested' | 'completed' | 'failed' | 'cancelled' | 'expired';

export type AccountVerificationStatus = 'pending' | 'verified' | 'failed';

export interface CarrierPaymentRequest {
  amount: number;
  currency: string;
  senderPhone: string;
  receiverPhone: string;
  reference: string;
  externalId: string;
  callbackUrl: string;
  pin?: string;
}

export interface CarrierPaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  message?: string;
}

export interface CarrierTransferRequest {
  amount: number;
  currency: string;
  receiverPhone: string;
  reference: string;
  externalId: string;
  callbackUrl: string;
  pin?: string;
}

export interface CarrierTransferResponse {
  transactionId: string;
  status: PaymentStatus;
  message?: string;
}

export interface QRCodeData {
  id: string;
  receiverId: string;
  receiverName: string;
  receiverPhone: string;
  carrier: Carrier;
  currency: string;
  createdAt: string;
  expiresAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
