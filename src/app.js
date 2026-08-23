import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ApiResponse } from './utils/apiResponse.js';
import { ApiError } from './utils/apiError.js';
import { errorHandler } from './middleware/error.middleware.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';


// Route Imports
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import addressRoutes from './routes/address.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reviewRoutes from './routes/review.routes.js';


const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Apply global rate limiter
app.use(globalRateLimiter);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Quiva Lux API is running!' });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Mount alongside your other API routes
app.use('/api/addresses', addressRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);


// Health Check Endpoint
app.get('/health', (req, res) => {
  return ApiResponse.success(res, 200, 'Quiva Lux API is active and operational', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Unknown Routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;