import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid Category ID format'),
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.string().transform((val) => parseFloat(val)),
  discountPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : null)),
  stockQuantity: z.string().default('0').transform((val) => parseInt(val, 10)),
});