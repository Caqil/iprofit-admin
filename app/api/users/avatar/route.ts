// app/api/user/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration
const UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadDir: path.join(process.cwd(), 'public', 'uploads', 'avatars'),
  urlPath: '/uploads/avatars'
};

// POST /api/user/avatar - Upload profile picture
async function uploadAvatarHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    // Get current user
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return apiHandler.notFound('User not found');
    }

    if (currentUser.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${currentUser.status.toLowerCase()}`);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    const deviceId = formData.get('deviceId') as string;

    if (!file) {
      return apiHandler.badRequest('No file uploaded');
    }

    if (!deviceId) {
      return apiHandler.badRequest('Device ID is required');
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      return apiHandler.badRequest(validationError);
    }

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Generate unique filename
    const fileExtension = getFileExtension(file.name);
    const uniqueFilename = `${session.user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    const filePath = path.join(UPLOAD_CONFIG.uploadDir, uniqueFilename);
    const publicUrl = `${UPLOAD_CONFIG.urlPath}/${uniqueFilename}`;

    try {
      // Create upload directory if it doesn't exist
      await ensureUploadDirectory();

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(filePath, buffer);

      // Remove old avatar if exists
      if (currentUser.profilePicture) {
        await removeOldAvatar(currentUser.profilePicture);
      }

      // Update user with new avatar
      const updatedUser = await User.findByIdAndUpdate(
        currentUser._id,
        {
          profilePicture: publicUrl,
          deviceId,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedUser) {
        // Clean up uploaded file if user update fails
        await cleanupFile(filePath);
        return apiHandler.internalError('Failed to update user avatar');
      }

      // Log audit
      await AuditLog.create({
        adminId: null,
        action: 'USER_AVATAR_UPLOAD',
        entity: 'User',
        entityId: updatedUser._id.toString(),
        oldData: { profilePicture: currentUser.profilePicture },
        newData: { profilePicture: publicUrl },
        status: 'Success',
        metadata: {
          userSelfUpdate: true,
          fileName: uniqueFilename,
          fileSize: file.size,
          fileType: file.type
        },
        ipAddress: clientIP,
        userAgent,
        severity: 'Low'
      });

      return apiHandler.success({
        user: {
          id: updatedUser._id.toString(),
          profilePicture: updatedUser.profilePicture
        },
        avatar: {
          url: publicUrl,
          uploadedAt: new Date().toISOString()
        },
        message: 'Avatar uploaded successfully'
      });

    } catch (fileError) {
      console.error('File upload error:', fileError);
      await cleanupFile(filePath);
      return apiHandler.internalError('Failed to upload file');
    }

  } catch (error) {
    console.error('Upload avatar error:', error);
    return apiHandler.internalError('Avatar upload failed');
  }
}

// DELETE /api/user/avatar - Remove profile picture
async function removeAvatarHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    // Get device ID from query params
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return apiHandler.badRequest('Device ID is required');
    }

    // Get current user
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return apiHandler.notFound('User not found');
    }

    if (currentUser.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${currentUser.status.toLowerCase()}`);
    }

    if (!currentUser.profilePicture) {
      return apiHandler.badRequest('No avatar to remove');
    }

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Remove avatar file
    await removeOldAvatar(currentUser.profilePicture);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      {
        profilePicture: null,
        deviceId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedUser) {
      return apiHandler.internalError('Failed to remove avatar');
    }

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'USER_AVATAR_REMOVE',
      entity: 'User',
      entityId: updatedUser._id.toString(),
      oldData: { profilePicture: currentUser.profilePicture },
      newData: { profilePicture: null },
      status: 'Success',
      metadata: {
        userSelfUpdate: true
      },
      ipAddress: clientIP,
      userAgent,
      severity: 'Low'
    });

    return apiHandler.success({
      user: {
        id: updatedUser._id.toString(),
        profilePicture: null
      },
      message: 'Avatar removed successfully'
    });

  } catch (error) {
    console.error('Remove avatar error:', error);
    return apiHandler.internalError('Avatar removal failed');
  }
}

// Helper functions
function validateFile(file: File): string | null {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxSize) {
    return `File size too large. Maximum size is ${UPLOAD_CONFIG.maxSize / (1024 * 1024)}MB`;
  }

  // Check file type
  if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`;
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    return 'Invalid file name';
  }

  return null;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
}

async function ensureUploadDirectory(): Promise<void> {
  if (!existsSync(UPLOAD_CONFIG.uploadDir)) {
    const fs = require('fs').promises;
    await fs.mkdir(UPLOAD_CONFIG.uploadDir, { recursive: true });
  }
}

async function removeOldAvatar(avatarUrl: string): Promise<void> {
  try {
    if (avatarUrl && avatarUrl.startsWith(UPLOAD_CONFIG.urlPath)) {
      const filename = path.basename(avatarUrl);
      const filePath = path.join(UPLOAD_CONFIG.uploadDir, filename);
      
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }
  } catch (error) {
    console.error('Error removing old avatar:', error);
    // Don't throw error as this is cleanup
  }
}

async function cleanupFile(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

export const POST = withErrorHandler(uploadAvatarHandler);
export const DELETE = withErrorHandler(removeAvatarHandler);