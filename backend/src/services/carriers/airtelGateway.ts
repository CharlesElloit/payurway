import axios from 'axios';
import { config } from '../../config';
import { CarrierGateway } from '../carrierGateway';
import { CarrierPaymentRequest, CarrierPaymentResponse, CarrierTransferRequest, CarrierTransferResponse } from '../../types';
import { CarrierError } from '../../utils/errors';
import logger from '../../utils/logger';

export class AirtelGateway implements CarrierGateway {
  private apiUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.apiUrl = config.airtel.apiUrl;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/auth/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${config.airtel.clientId}:${config.airtel.clientSecret}`
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken!;
    } catch (error: any) {
      logger.error({ error: error.response?.data }, 'Airtel token request failed');
      throw new CarrierError('airtel', 'Failed to get access token');
    }
  }

  async requestToPay(data: CarrierPaymentRequest): Promise<CarrierPaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/merchant/v1/payments`,
        {
          amount: data.amount,
          currency: data.currency,
          externalTransactionID: data.externalId,
          customer: {
            msisdn: data.senderPhone,
          },
          transactionReference: data.reference,
          receivingParty: {
            msisdn: data.receiverPhone,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': data.currency,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info({ transactionId: data.externalId }, 'Airtel payment initiated');

      return {
        transactionId: data.externalId,
        status: 'processing',
        message: 'Payment initiated',
      };
    } catch (error: any) {
      const message = error.response?.data?.status?.message || error.message;
      logger.error({ error: error.response?.data, externalId: data.externalId }, 'Airtel payment failed');
      throw new CarrierError('airtel', message);
    }
  }

  async transfer(data: CarrierTransferRequest): Promise<CarrierTransferResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/merchant/v1/disbursements`,
        {
          amount: data.amount,
          currency: data.currency,
          externalTransactionID: data.externalId,
          payee: {
            msisdn: data.receiverPhone,
          },
          transactionReference: data.reference,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': data.currency,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        transactionId: data.externalId,
        status: 'processing',
        message: 'Disbursement initiated',
      };
    } catch (error: any) {
      const message = error.response?.data?.status?.message || error.message;
      throw new CarrierError('airtel', message);
    }
  }

  async checkStatus(transactionId: string): Promise<{ status: string; details?: any }> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/standard/v1/payments/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
          },
        }
      );

      return {
        status: response.data.data?.status?.toLowerCase() || 'unknown',
        details: response.data,
      };
    } catch (error: any) {
      throw new CarrierError('airtel', error.response?.data?.status?.message || error.message);
    }
  }

  async getBalance(phoneNumber: string): Promise<{ balance: number; currency: string }> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/standard/v1/user/balance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': 'UGX',
          },
          params: {
            MSISDN: phoneNumber,
          },
        }
      );

      return {
        balance: parseFloat(response.data.data?.balance || '0'),
        currency: response.data.data?.currency || 'UGX',
      };
    } catch (error: any) {
      logger.warn({ error: error.response?.data, phoneNumber }, 'Airtel balance check failed');
      throw new CarrierError('airtel', error.response?.data?.status?.message || 'Failed to fetch balance');
    }
  }

  async verifyPin(phoneNumber: string, pin: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const referenceId = `verify-${Date.now()}`;

      await axios.post(
        `${this.apiUrl}/merchant/v1/payments`,
        {
          amount: 1,
          currency: 'UGX',
          externalTransactionID: referenceId,
          customer: {
            msisdn: phoneNumber,
          },
          transactionReference: 'PIN Verification',
          pin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': 'UGX',
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info({ phoneNumber }, 'Airtel PIN verification initiated');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.status?.message || error.message;
      logger.warn({ error: error.response?.data, phoneNumber }, 'Airtel PIN verification failed');
      throw new CarrierError('airtel', message || 'PIN verification failed');
    }
  }
}
