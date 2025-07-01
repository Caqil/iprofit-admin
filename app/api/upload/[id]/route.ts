import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { File } from '@/models/File';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

// GET /api/upload/[id] - Get uploaded file
async function getUploadedFileHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fileId = params.id;

    // Validate file ID
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return apiHandler.badRequest('Invalid file ID');
    }

    // Get file record
    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return apiHandler.notFound('File not found');
    }

    // Check permissions
    if (!fileRecord.isPublic && !fileRecord.userId.equals(userId)) {
      // Check if user is admin (you might want to add admin check here)
      return apiHandler.forbidden('Access denied');
    }

    // Check if file exists on disk
    if (!existsSync(fileRecord.filePath)) {
      return apiHandler.notFound('File not found on disk');
    }

    // Update access tracking
    fileRecord.accessCount += 1;
    fileRecord.lastAccessedAt = new Date();
    await fileRecord.save();

    // Get file stats for download parameter
    const url = new URL(request.url);
    const download = url.searchParams.get('download') === 'true';
    const thumbnail = url.searchParams.get('thumbnail') === 'true';

    // Read file
    let fileBuffer = await readFile(fileRecord.filePath);
    let contentType = fileRecord.mimeType;
    let fileName = fileRecord.originalName;

    // Generate thumbnail for images if requested
    if (thumbnail && fileRecord.mimeType.startsWith('image/')) {
      const sharp = require('sharp');
      fileBuffer = await sharp(fileBuffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      contentType = 'image/jpeg';
      fileName = `thumbnail_${fileName}`;
    }

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    }

    // Add caching headers for public files
    if (fileRecord.isPublic) {
      headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    } else {
      headers.set('Cache-Control', 'private, no-cache');
    }

    // Log file access for security files
    if (fileRecord.fileType === 'kyc_document') {
      await AuditLog.create({
        adminId: null,
        action: 'FILE_ACCESSED',
        entity: 'File',
        entityId: fileId,
        status: 'Success',
        metadata: {
          userSelfAction: true,
          userId: userId.toString(),
          fileType: fileRecord.fileType,
          fileName: fileRecord.fileName,
          accessType: download ? 'download' : thumbnail ? 'thumbnail' : 'view',
          accessCount: fileRecord.accessCount
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        severity: 'Low'
      });
    }

    return new NextResponse(fileBuffer, { headers });

  } catch (error) {
    console.error('Error retrieving file:', error);
    return apiHandler.internalError('Failed to retrieve file');
  }
}

// DELETE /api/upload/[id] - Delete uploaded file
async function deleteUploadedFileHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fileId = params.id;

    // Validate file ID
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return apiHandler.badRequest('Invalid file ID');
    }

    // Get file record
    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return apiHandler.notFound('File not found');
    }

    // Check permissions - only file owner can delete
    if (!fileRecord.userId.equals(userId)) {
      return apiHandler.forbidden('Access denied');
    }

    // Prevent deletion of approved KYC documents
    if (fileRecord.fileType === 'kyc_document' && fileRecord.status === 'approved') {
      return apiHandler.badRequest('Cannot delete approved KYC documents');
    }

    // Get user to update profile picture if needed
    const user = await User.findById(userId);
    
    // If deleting current profile picture, clear it from user
    if (fileRecord.fileType === 'profile_image' && user?.profilePicture === fileRecord.fileUrl) {
      user.profilePicture = undefined;
      await user.save();
    }

    // If deleting KYC document, remove from user's KYC documents array
    if (fileRecord.fileType === 'kyc_document' && user) {
      user.kycDocuments = user.kycDocuments?.filter(doc => doc.url !== fileRecord.fileUrl) || [];
      await user.save();
    }

    // Delete file from disk
    if (existsSync(fileRecord.filePath)) {
      await unlink(fileRecord.filePath);
    }

    // Store file info for audit log
    const fileInfo = {
      fileName: fileRecord.fileName,
      originalName: fileRecord.originalName,
      fileType: fileRecord.fileType,
      fileSize: fileRecord.fileSize,
      category: fileRecord.category
    };

    // Delete file record from database
    await File.findByIdAndDelete(fileId);

    // Log file deletion
    await AuditLog.create({
      adminId: null,
      action: 'FILE_DELETED',
      entity: 'File',
      entityId: fileId,
      oldData: fileInfo,
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user?.name,
        fileType: fileRecord.fileType,
        fileName: fileRecord.fileName,
        fileSize: fileRecord.fileSize,
        wasApproved: fileRecord.status === 'approved'
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: fileRecord.fileType === 'kyc_document' ? 'Medium' : 'Low'
    });

    return apiHandler.success({
      message: 'File deleted successfully',
      deletedFile: {
        id: fileId,
        fileName: fileRecord.originalName,
        fileType: fileRecord.fileType
      }
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return apiHandler.internalError('Failed to delete file');
  }
}

export const GET = withErrorHandler(getUploadedFileHandler);
export const DELETE = withErrorHandler(deleteUploadedFileHandler);