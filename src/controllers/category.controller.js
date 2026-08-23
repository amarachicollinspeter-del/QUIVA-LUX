import slugify from 'slugify';
import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new ApiError(400, 'Category name is required');

    const slug = slugify(name, { lower: true, strict: true });

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ApiError(400, 'Category with this name already exists');

    const category = await prisma.category.create({
      data: { name, slug, description },
    });

    return ApiResponse.success(res, 201, 'Category created successfully', { category });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return ApiResponse.success(res, 200, 'Categories retrieved', { categories });
  } catch (error) {
    next(error);
  }
};