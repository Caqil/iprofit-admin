import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { File } from '@/models/File';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';

// KYC document upload validation
const kycUploadSchema = z.object({
  documentType: z.enum(['national_id', 'passport', 'drivers_license', 'utility_bill', 'bank_statement', 'selfie_with_id']),
  documentNumber: z.string().optional(),
  expiryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  issuingAuthority: z.string().optional(),
  deviceId: z.string().optional()
});

// Configuration
const KYC_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  uploadDir: path.join(process.cwd(), 'uploads', 'kyc'),
  urlPath: '/uploads/kyc',
  imageQuality: 90,
  maxImageDimension: 2048
};

async function uploadKYCDocumentHandler(request: NextRequest) {
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
    const file = formData.get('document') as File;
    const documentType = formData.get('documentType') as string;
    const documentNumber = formData.get('documentNumber') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const issuingAuthority = formData.get('issuingAuthority') as string;
    const deviceId = formData.get('deviceId') as string;

    if (!file) {
      return apiHandler.badRequest('No file uploaded');
    }

    // Validate form data
    const validationResult = kycUploadSchema.safeParse({
      documentType,
      documentNumber,
      expiryDate,
      issuingAuthority,
      deviceId
    });

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { documentType: docType, expiryDate: expiry } = validationResult.data;

    // Validate file
    const fileValidation = validateFile(file, KYC_CONFIG);
    if (!fileValidation.valid) {
      return apiHandler.badRequest(fileValidation.error!);
    }

    // Check if user already has this document type
    const existingDoc = await File.findOne({
      userId: userId,
      fileType: 'kyc_document',
      category: docType,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingDoc) {
      return apiHandler.conflict(`${docType.replace('_', ' ')} document already uploaded`);
    }

    // Create upload directory
    await mkdir(KYC_CONFIG.uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${docType}_${userId}_${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(KYC_CONFIG.uploadDir, uniqueFileName);
    const fileUrl = `${KYC_CONFIG.urlPath}/${uniqueFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let fileBuffer = Buffer.from(arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer as ArrayBuffer);
    let metadata: any = {};

    // Process image files
    if (file.type.startsWith('image/')) {
      const imageInfo = await sharp(fileBuffer).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;

      // Resize if too large
      if (imageInfo.width! > KYC_CONFIG.maxImageDimension || imageInfo.height! > KYC_CONFIG.maxImageDimension) {
        fileBuffer = await sharp(fileBuffer)
          .resize(KYC_CONFIG.maxImageDimension, KYC_CONFIG.maxImageDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: KYC_CONFIG.imageQuality })
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
      fileType: 'kyc_document',
      category: docType,
      status: 'pending',
      uploadedBy: userId,
      uploadedFromDevice: deviceId,
      metadata: {
        ...metadata,
        documentType: docType,
        expiryDate: expiry,
        issuingAuthority: issuingAuthority,
        virusScanned: false
      },
      isPublic: false,
      tags: ['kyc', docType]
    });

    // Update user's KYC documents array
    if (!user.kycDocuments) user.kycDocuments = [];
    
    const existingDocIndex = user.kycDocuments.findIndex(doc => doc.type === docType);
    const docData = {
      type: docType,
      url: fileUrl,
      uploadedAt: new Date()
    };

    if (existingDocIndex !== -1) {
      user.kycDocuments[existingDocIndex] = docData;
    } else {
      user.kycDocuments.push(docData);
    }

    user.lastActiveAt = new Date();
    await user.save();

    // Log upload
    await AuditLog.create({
      adminId: null,
      action: 'KYC_DOCUMENT_UPLOADED',
      entity: 'File',
      entityId: fileRecord._id.toString(),
      newData: {
        documentType: docType,
        fileName: uniqueFileName,
        fileSize: fileBuffer.length,
        originalName: file.name
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        documentType: docType,
        fileSize: fileBuffer.length,
        compressionApplied: metadata.compressionApplied || false,
        deviceId: deviceId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium'
    });

    return apiHandler.success({
      message: 'KYC document uploaded successfully',
      file: {
        id: fileRecord._id,
        fileName: uniqueFileName,
        originalName: file.name,
        fileUrl: fileUrl,
        fileSize: fileBuffer.length,
        documentType: docType,
        status: 'pending',
        uploadedAt: fileRecord.createdAt
      },
      nextSteps: [
        'Document is under review',
        'You will be notified once approved',
        'Upload remaining required documents'
      ]
    });

  } catch (error) {
    console.error('Error uploading KYC document:', error);
    return apiHandler.internalError('Failed to upload KYC document');
  }
}

// app/api/upload/profile-image/route.ts
async function uploadProfileImageHandler(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const deviceId = formData.get('deviceId') as string;

    if (!file) {
      return apiHandler.badRequest('No image uploaded');
    }

    // Configuration for profile images
    const PROFILE_CONFIG = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      uploadDir: path.join(process.cwd(), 'uploads', 'profiles'),
      urlPath: '/uploads/profiles',
      imageSize: 512, // Square profile image
      quality: 85
    };

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

// app/api/upload/task-proof/route.ts
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

    // Configuration for task proof
    const TASK_CONFIG = {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'],
      uploadDir: path.join(process.cwd(), 'uploads', 'tasks'),
      urlPath: '/uploads/tasks',
      imageQuality: 90,
      maxImageDimension: 1920
    };

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
        fileBuffer = await sharp(fileBuffer)
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

export const POST = withErrorHandler(uploadKYCDocumentHandler);

// Export handlers for the specific routes
export { uploadKYCDocumentHandler, uploadProfileImageHandler, uploadTaskProofHandler };

