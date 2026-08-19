import { Carrier, CarrierPaymentRequest, CarrierPaymentResponse, CarrierTransferRequest, CarrierTransferResponse } from '../types';
import { MTNGateway } from './carriers/mtnGateway';
import { AirtelGateway } from './carriers/airtelGateway';
import { CarrierError } from '../utils/errors';

export interface CarrierGateway {
  requestToPay(data: CarrierPaymentRequest): Promise<CarrierPaymentResponse>;
  transfer(data: CarrierTransferRequest): Promise<CarrierTransferResponse>;
  checkStatus(transactionId: string): Promise<{ status: string; details?: any }>;
  getBalance(phoneNumber: string): Promise<{ balance: number; currency: string }>;
  verifyPin(phoneNumber: string, pin: string): Promise<boolean>;
}

class CarrierGatewayFactory {
  private gateways: Map<Carrier, CarrierGateway> = new Map();

  constructor() {
    this.gateways.set('mtn', new MTNGateway());
    this.gateways.set('airtel', new AirtelGateway());
  }

  getGateway(carrier: Carrier): CarrierGateway {
    const gateway = this.gateways.get(carrier);
    if (!gateway) {
      throw new CarrierError(carrier, `No gateway configured for carrier: ${carrier}`);
    }
    return gateway;
  }

  registerGateway(carrier: Carrier, gateway: CarrierGateway) {
    this.gateways.set(carrier, gateway);
  }
}

export const carrierGatewayFactory = (carrier: Carrier): CarrierGateway => {
  const factory = new CarrierGatewayFactory();
  return factory.getGateway(carrier);
};
