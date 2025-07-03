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
        await sharp(fileBuffer)
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

// Export only the POST handler for Next.js App Router
export const POST = withErrorHandler(uploadKYCDocumentHandler);