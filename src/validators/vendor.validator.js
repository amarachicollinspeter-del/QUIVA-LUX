import { z } from 'zod';

export const createVendorSchema = z.object({
  storeName: z.string().min(3, 'Store name must be at least 3 characters'),
  description: z.string().optional(),
  phone: z.string().min(7, 'Phone number is required'),
  businessAddress: z.string().min(5, 'Business address is required'),
});