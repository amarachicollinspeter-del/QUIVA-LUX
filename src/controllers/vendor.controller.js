import slugify from 'slugify';
import { prisma } from '../lib/prisma.js';
import { createVendorSchema } from '../validators/vendor.validator.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const registerVendorStore = async (req, res, next) => {
  try {
    const validatedData = createVendorSchema.parse(req.body);

    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });
    if (existingVendor) throw new ApiError(400, 'You already have a vendor store profile');

    const slug = slugify(validatedData.storeName, { lower: true, strict: true });

    let storeLogoUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'quiva-lux/logos');
      storeLogoUrl = uploadResult.url;
    }

    const vendor = await prisma.vendor.create({
      data: {
        userId: req.user.id,
        storeName: validatedData.storeName,
        slug,
        description: validatedData.description,
        phone: validatedData.phone,
        businessAddress: validatedData.businessAddress,
        storeLogo: storeLogoUrl,
      },
    });

    // Update user role if currently CUSTOMER
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'VENDOR' },
    });

    return ApiResponse.success(res, 201, 'Vendor store profile created successfully', { vendor });
  } catch (error) {
    next(error);
  }
};

export const getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      include: { products: true },
    });
    if (!vendor) throw new ApiError(404, 'Vendor profile not found');

    return ApiResponse.success(res, 200, 'Vendor profile retrieved', { vendor });
  } catch (error) {
    next(error);
  }
};