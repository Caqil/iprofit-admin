import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { File } from '@/models/File';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';

// Configuration for task proof
const TASK_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'],
  uploadDir: path.join(process.cwd(), 'uploads', 'tasks'),
  urlPath: '/uploads/tasks',
  imageQuality: 90,
  maxImageDimension: 1920
};

// File validation helper
function validateFile(file: File, config: any): { valid: boolean; error?: string } {
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

  // Check file name
  if (!file.name || file.name.length < 3) {
    return {
      valid: false,
      error: 'Invalid file name'
    };
  }

  return { valid: true };
}

async function uploadTaskProofHandler(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('proof') as File;
    const taskId = formData.get('taskId') as string;
    const description = formData.get('description') as string;
    const deviceId = formData.get('deviceId') as string;

    if (!file) {
      return apiHandler.badRequest('No proof file uploaded');
    }

    if (!taskId) {
      return apiHandler.badRequest('Task ID is required');
    }

    // Validate task ID
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return apiHandler.badRequest('Invalid task ID');
    }

    // Validate file
    const fileValidation = validateFile(file, TASK_CONFIG);
    if (!fileValidation.valid) {
      return apiHandler.badRequest(fileValidation.error!);
    }

    // Create upload directory
    await mkdir(TASK_CONFIG.uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `task_${taskId}_${userId}_${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(TASK_CONFIG.uploadDir, uniqueFileName);
    const fileUrl = `${TASK_CONFIG.urlPath}/${uniqueFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let fileBuffer = Buffer.from(arrayBuffer);
    let metadata: any = { taskId: taskId };

    // Process image files
    if (file.type.startsWith('image/')) {
      const imageInfo = await sharp(fileBuffer).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;

      // Resize if too large
      if (imageInfo.width! > TASK_CONFIG.maxImageDimension || imageInfo.height! > TASK_CONFIG.maxImageDimension) {
        await sharp(fileBuffer)
          .resize(TASK_CONFIG.maxImageDimension, TASK_CONFIG.maxImageDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: TASK_CONFIG.imageQuality })
          .toBuffer();
        
        metadata.compressionApplied = true;
      }
    }

    // Save file to disk
    await writeFile(filePath, fileBuffer);

    // Create file record
    const fileRecord = await File.create({
      userId: userId,
      originalName: file.name,
      fileName: uniqueFileName,
      filePath: filePath,
      fileUrl: fileUrl,
      mimeType: file.type,
      fileSize: fileBuffer.length,
      fileType: 'task_proof',
      category: 'submission',
      status: 'pending',
      uploadedBy: userId,
      uploadedFromDevice: deviceId,
      metadata: metadata,
      isPublic: false,
      tags: ['task', 'proof', taskId]
    });

    // Log upload
    await AuditLog.create({
      adminId: null,
      action: 'TASK_PROOF_UPLOADED',
      entity: 'File',
      entityId: fileRecord._id.toString(),
      newData: {
        taskId: taskId,
        fileName: uniqueFileName,
        fileSize: fileBuffer.length,
        originalName: file.name,
        description: description
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        taskId: taskId,
        fileSize: fileBuffer.length,
        compressionApplied: metadata.compressionApplied || false,
        deviceId: deviceId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    return apiHandler.success({
      message: 'Task proof uploaded successfully',
      file: {
        id: fileRecord._id,
        fileName: uniqueFileName,
        originalName: file.name,
        fileUrl: fileUrl,
        fileSize: fileBuffer.length,
        taskId: taskId,
        status: 'pending',
        uploadedAt: fileRecord.createdAt
      },
      nextSteps: [
        'Proof is under review',
        'Task will be marked as completed once approved',
        'You will be notified of the review result'
      ]
    });

  } catch (error) {
    console.error('Error uploading task proof:', error);
    return apiHandler.internalError('Failed to upload task proof');
  }
}

// Export only the POST handler for Next.js App Router
export const POST = withErrorHandler(uploadTaskProofHandler);