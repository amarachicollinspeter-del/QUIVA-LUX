import slugify from 'slugify';
import { prisma } from '../lib/prisma.js';
import { createProductSchema } from '../validators/product.validator.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const createProduct = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) throw new ApiError(403, 'Only approved vendors can create products');

    const validatedData = createProductSchema.parse(req.body);
    const slug = `${slugify(validatedData.name, { lower: true, strict: true })}-${Date.now().toString().slice(-4)}`;

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        slug,
        description: validatedData.description,
        price: validatedData.price,
        discountPrice: validatedData.discountPrice,
        stockQuantity: validatedData.stockQuantity,
      },
    });

    // Handle uploaded product images if provided
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map((file, index) =>
        uploadToCloudinary(file.buffer, 'quiva-lux/products').then((res) => ({
          productId: product.id,
          url: res.url,
          publicId: res.publicId,
          isPrimary: index === 0,
        }))
      );

      const imagesData = await Promise.all(imagePromises);
      await prisma.productImage.createMany({ data: imagesData });
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true, category: true, vendor: { select: { storeName: true, slug: true } } },
    });

    return ApiResponse.success(res, 201, 'Product created successfully', { product: fullProduct });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isActive: true,
      ...(category && { category: { slug: category } }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { images: true, category: true, vendor: { select: { storeName: true, slug: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};