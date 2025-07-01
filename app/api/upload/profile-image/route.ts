// app/api/upload/profile-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { File } from '@/models/File';
import { AuditLog } from '@/models/AuditLog';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';

// Configuration for profile images
const PROFILE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadDir: path.join(process.cwd(), 'uploads', 'profiles'),
  urlPath: '/uploads/profiles',
  imageSize: 512, // Square profile image
  quality: 85
};

// File validation helper
function validateFile(file: File, config: typeof PROFILE_CONFIG): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size too large. Maximum allowed: ${Math.round(config.maxSize / 1024 / 1024)}MB`
    };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

// POST /api/upload/profile-image - Upload profile image
export async function POST(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const deviceId = formData.get('deviceId') as string;

    if (!file) {
      return apiHandler.badRequest('No image uploaded');
    }

    // Validate file
    const fileValidation = validateFile(file, PROFILE_CONFIG);
    if (!fileValidation.valid) {
      return apiHandler.badRequest(fileValidation.error!);
    }

    // Create upload directory
    await mkdir(PROFILE_CONFIG.uploadDir, { recursive: true });

    // Generate unique filename
    const uniqueFileName = `profile_${userId}_${crypto.randomUUID()}.jpg`;
    const filePath = path.join(PROFILE_CONFIG.uploadDir, uniqueFileName);
    const fileUrl = `${PROFILE_CONFIG.urlPath}/${uniqueFileName}`;

    // Convert and process image
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Process image with Sharp
    const processedBuffer = await sharp(originalBuffer)
      .resize(PROFILE_CONFIG.imageSize, PROFILE_CONFIG.imageSize, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: PROFILE_CONFIG.quality })
      .toBuffer();

    // Save file
    await writeFile(filePath, processedBuffer);

    // Remove old profile image if exists
    const oldProfileImage = await File.findOne({
      userId: userId,
      fileType: 'profile_image',
      status: 'active'
    });

    if (oldProfileImage) {
      // Mark old image as inactive instead of deleting immediately
      oldProfileImage.status = 'rejected';
      await oldProfileImage.save();
    }

    // Create file record
    const fileRecord = await File.create({
      userId: userId,
      originalName: file.name,
      fileName: uniqueFileName,
      filePath: filePath,
      fileUrl: fileUrl,
      mimeType: 'image/jpeg',
      fileSize: processedBuffer.length,
      fileType: 'profile_image',
      status: 'active',
      uploadedBy: userId,
      uploadedFromDevice: deviceId,
      metadata: {
        width: PROFILE_CONFIG.imageSize,
        height: PROFILE_CONFIG.imageSize,
        compressionApplied: true
      },
      isPublic: true,
      tags: ['profile', 'avatar']
    });

    // Update user profile picture
    user.profilePicture = fileUrl;
    user.lastActiveAt = new Date();
    await user.save();

    // Log upload
    await AuditLog.create({
      adminId: null,
      action: 'PROFILE_IMAGE_UPLOADED',
      entity: 'File',
      entityId: fileRecord._id.toString(),
      oldData: { profilePicture: oldProfileImage?.fileUrl },
      newData: { profilePicture: fileUrl },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        fileSize: processedBuffer.length,
        originalSize: originalBuffer.length,
        compressionRatio: Math.round((1 - processedBuffer.length / originalBuffer.length) * 100),
        deviceId: deviceId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    return apiHandler.success({
      message: 'Profile image uploaded successfully',
      file: {
        id: fileRecord._id,
        fileName: uniqueFileName,
        fileUrl: fileUrl,
        fileSize: processedBuffer.length,
        uploadedAt: fileRecord.createdAt
      },
      user: {
        profilePicture: fileUrl
      }
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    return apiHandler.internalError('Failed to upload profile image');
  }
}