import axios from 'axios';
import { config } from '../../config';
import { CarrierGateway } from '../carrierGateway';
import { CarrierPaymentRequest, CarrierPaymentResponse, CarrierTransferRequest, CarrierTransferResponse } from '../../types';
import { CarrierError } from '../../utils/errors';
import logger from '../../utils/logger';

export class MTNGateway implements CarrierGateway {
  private apiUrl: string;
  private subscriptionKey: string;
  private environment: string;

  constructor() {
    this.apiUrl = config.mtn.apiUrl;
    this.subscriptionKey = config.mtn.subscriptionKey;
    this.environment = config.mtn.environment;
  }

  private async getAccessToken(): Promise<string> {
    try {
      const credentials = Buffer.from(
        `${config.mtn.apiKey}:${config.mtn.subscriptionKey}`
      ).toString('base64');

      const response = await axios.post(
        `${this.apiUrl}/collection/token/`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      logger.error({ error: error.response?.data }, 'MTN token request failed');
      throw new CarrierError('mtn', 'Failed to get access token');
    }
  }

  async requestToPay(data: CarrierPaymentRequest): Promise<CarrierPaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/collection/v1_0/requesttopay`,
        {
          amount: data.amount.toString(),
          currency: data.currency,
          externalId: data.externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: data.senderPhone,
          },
          payerMessage: `Payment to ${data.receiverPhone}`,
          payeeNote: `Ref: ${data.reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': data.externalId,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Callback-Url': data.callbackUrl,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info({ transactionId: data.externalId }, 'MTN request to pay initiated');

      return {
        transactionId: data.externalId,
        status: 'processing',
        message: 'Request to pay initiated',
      };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      logger.error({ error: error.response?.data, externalId: data.externalId }, 'MTN request to pay failed');
      throw new CarrierError('mtn', message);
    }
  }

  async transfer(data: CarrierTransferRequest): Promise<CarrierTransferResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/disbursement/v1_0/transfer`,
        {
          amount: data.amount.toString(),
          currency: data.currency,
          externalId: data.externalId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: data.receiverPhone,
          },
          payerMessage: `Transfer ${data.reference}`,
          payeeNote: `Ref: ${data.reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': data.externalId,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Callback-Url': data.callbackUrl,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        transactionId: data.externalId,
        status: 'processing',
        message: 'Transfer initiated',
      };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new CarrierError('mtn', message);
    }
  }

  async checkStatus(transactionId: string): Promise<{ status: string; details?: any }> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/collection/v1_0/requesttopay/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        status: response.data.status?.toLowerCase() || 'unknown',
        details: response.data,
      };
    } catch (error: any) {
      throw new CarrierError('mtn', error.response?.data?.message || error.message);
    }
  }
}
