import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export const initializePayment = async ({ email, amountInKobo, reference, metadata }) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amountInKobo,
        reference,
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new ApiError(500, 'Paystack payment initialization failed', error.response?.data || error.message);
  }
};

export const verifyPaymentTransaction = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new ApiError(500, 'Paystack verification request failed', error.response?.data || error.message);
  }
};