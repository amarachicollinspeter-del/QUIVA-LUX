import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ApiError(400, 'An account with this email address already exists');
    }

    const hashedPassword = await hashPassword(validatedData.password);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        role: validatedData.role,
        cart: { create: {} }, // Initialize customer shopping cart
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({ userId: user.id, role: user.role });

    return ApiResponse.success(res, 201, 'User account registered successfully', { user, token });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new ApiError(400, 'Validation failed', error.errors));
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials provided');
    }

    const isMatch = await comparePassword(validatedData.password, user.passwordHash);

    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials provided');
    }

    const token = generateToken({ userId: user.id, role: user.role });

    const userProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    return ApiResponse.success(res, 200, 'Logged in successfully', { user: userProfile, token });
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(new ApiError(400, 'Validation failed', error.errors));
    }
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        vendor: true,
      },
    });

    return ApiResponse.success(res, 200, 'Profile details retrieved', { user });
  } catch (error) {
    next(error);
  }
};