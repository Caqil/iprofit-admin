// app/api/settings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting, ISetting, SettingHistory } from '@/models/Setting';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';
import { encrypt, decrypt } from '@/lib/encryption';
import { updateSettingSchema } from '@/lib/validation';

// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

// Helper functions
function processSettingValue(setting: ISetting): any {
  if (setting.isEncrypted && setting.value) {
    try {
      return decrypt(setting.value);
    } catch (error) {
      console.error('Failed to decrypt setting value:', error);
      return null;
    }
  }
  return setting.value;
}

function validateSettingValue(value: any, validation: any, dataType: string): boolean {
  if (!validation) return true;

  // Required validation
  if (validation.required && (value === null || value === undefined || value === '')) {
    return false;
  }

  // Type-specific validations
  if (dataType === 'number' && typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) return false;
    if (validation.max !== undefined && value > validation.max) return false;
  }

  if (dataType === 'string' && typeof value === 'string') {
    if (validation.min !== undefined && value.length < validation.min) return false;
    if (validation.max !== undefined && value.length > validation.max) return false;
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) return false;
    if (validation.enum && !validation.enum.includes(value)) return false;
  }

  return true;
}

// GET /api/settings/[id] - Get individual setting details
async function getSettingHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'settings.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate setting ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid setting ID format');
    }

    // Find setting with populated updatedBy
    const setting = await Setting.findById(id)
      .populate('updatedBy', 'email role')
      .lean();

    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Get setting history
    const history = await SettingHistory.find({ settingId: id })
      .populate('updatedBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const response = {
      setting: {
        ...setting,
        value: Array.isArray(setting) ? null : processSettingValue(setting as unknown as ISetting)
      },
      history: history
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get setting error:', error);
    return apiHandler.handleError(error);
  }
}

// PUT /api/settings/[id] - Update setting value
async function updateSettingHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'settings.update'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate setting ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid setting ID format');
    }

    const body = await request.json();
    const validationResult = updateSettingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.badRequest('Invalid update data', validationResult.error.errors);
    }

    const { value, reason } = validationResult.data;
    const adminId = request.headers.get('X-Admin-Id');

    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Find the setting
        const setting = await Setting.findById(id).session(session);
        
        if (!setting) {
          throw new Error('Setting not found');
        }

        // Check if setting is editable
        if (!setting.isEditable) {
          throw new Error('This setting is not editable');
        }

        // Validate new value
        if (!validateSettingValue(value, setting.validation, setting.dataType)) {
          throw new Error('Setting value does not meet validation requirements');
        }

        // Store old value for history
        const oldValue = processSettingValue(setting);

        // Encrypt new value if required
        let processedValue = value;
        if (setting.isEncrypted && value) {
          processedValue = encrypt(value);
        }

        // Update setting
        setting.value = processedValue;
        setting.updatedBy = new mongoose.Types.ObjectId(adminId!);
        await setting.save({ session });

        // Create history record
        await SettingHistory.create([{
          settingId: setting._id,
          oldValue,
          newValue: value,
          updatedBy: new mongoose.Types.ObjectId(adminId!),
          reason,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }], { session });

        // Create audit log
        await AuditLog.create([{
          adminId: new mongoose.Types.ObjectId(adminId!),
          action: 'settings.update',
          entity: 'Setting',
          entityId: setting._id.toString(),
          oldData: { value: oldValue },
          newData: { value },
          changes: [{
            field: 'value',
            oldValue,
            newValue: value
          }],
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          severity: setting.category === 'security' ? 'High' : 'Medium'
        }], { session });
      });

      // Fetch updated setting with population
      const updatedSetting = await Setting.findById(id)
        .populate('updatedBy', 'email role')
        .lean();

      if (!updatedSetting) {
        return apiHandler.notFound('Setting not found after update');
      }
      return apiHandler.success({
        ...updatedSetting,
        value: processSettingValue(updatedSetting as unknown as ISetting)
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Update setting error:', error);
    return apiHandler.handleError(error);
  }
}

// DELETE /api/settings/[id] - Delete setting (only if custom setting)
async function deleteSettingHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'settings.system' // Higher permission for deletion
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate setting ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid setting ID format');
    }

    const adminId = request.headers.get('X-Admin-Id');

    // Find the setting
    const setting = await Setting.findById(id);
    
    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Check if setting is system setting (cannot be deleted)
    if (!setting.isEditable) {
      return apiHandler.forbidden('System settings cannot be deleted');
    }

    // Delete setting
    await Setting.findByIdAndDelete(id);

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.delete',
      entity: 'Setting',
      entityId: id,
      oldData: {
        key: setting.key,
        category: setting.category,
        value: processSettingValue(setting)
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'High'
    });

    return apiHandler.success({ message: 'Setting deleted successfully' });

  } catch (error) {
    console.error('Delete setting error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers
export const GET = withErrorHandler(getSettingHandler);
export const PUT = withErrorHandler(updateSettingHandler);
export const DELETE = withErrorHandler(deleteSettingHandler);