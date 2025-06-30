// app/api/settings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting, ISetting, SettingHistory } from '@/models/Setting';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { updateSettingSchema } from '@/lib/validation';
import mongoose from 'mongoose';
import { encrypt, decrypt } from '@/lib/encryption';
import { invalidateSettingsCache } from '@/lib/settings-helper';

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

    // Validate MongoDB ObjectId or find by key
    let setting;
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Find by ID
      setting = await Setting.findById(id)
        .populate('updatedBy', 'email role')
        .lean();
    } else {
      // Find by key
      setting = await Setting.findOne({ key: id })
        .populate('updatedBy', 'email role')
        .lean();
    }

    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Get setting history
    const history = await SettingHistory.find({ settingId: setting._id })
      .populate('updatedBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const processedSetting = {
      ...setting,
      value: processSettingValue(setting as ISetting),
      history: history.map(h => ({
        ...h,
        oldValue: h.oldValue,
        newValue: h.newValue
      }))
    };

    return apiHandler.success(processedSetting);

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

    // Validate request body
    const body = await request.json();
    const validationResult = updateSettingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.badRequest('Invalid request data', validationResult.error.errors);
    }

    const { value, reason } = validationResult.data;
    const adminId = request.headers.get('X-Admin-Id');

    // Find setting by ID or key
    let setting;
    if (mongoose.Types.ObjectId.isValid(id)) {
      setting = await Setting.findById(id);
    } else {
      setting = await Setting.findOne({ key: id });
    }

    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Check if setting is editable
    if (!setting.isEditable) {
      return apiHandler.forbidden('This setting cannot be modified');
    }

    // Validate the new value against setting validation rules
    if (!validateSettingValue(value, setting.validation, setting.dataType)) {
      return apiHandler.badRequest('Value does not meet validation requirements', {
        validation: setting.validation,
        dataType: setting.dataType,
        providedValue: value
      });
    }

    // Store old value for history
    const oldValue = processSettingValue(setting);

    // Encrypt new value if required
    let processedValue = value;
    if (setting.isEncrypted && value) {
      processedValue = encrypt(value);
    }

    // Update the setting
    const updatedSetting = await Setting.findByIdAndUpdate(
      setting._id,
      {
        value: processedValue,
        updatedBy: new mongoose.Types.ObjectId(adminId!)
      },
      { new: true }
    ).populate('updatedBy', 'email role');

    if (!updatedSetting) {
      return apiHandler.handleError(new Error('Failed to update setting'));
    }

    // Invalidate cache after update
    invalidateSettingsCache();

    // Create history record
    await SettingHistory.create({
      settingId: setting._id,
      oldValue: oldValue,
      newValue: value,
      updatedBy: new mongoose.Types.ObjectId(adminId!),
      reason: reason || `Updated ${setting.key}`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.update',
      entity: 'Setting',
      entityId: setting._id.toString(),
      oldData: {
        key: setting.key,
        category: setting.category,
        value: oldValue
      },
      newData: {
        key: setting.key,
        category: setting.category,
        value: value
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium'
    });

    const responseData = {
      ...updatedSetting.toObject(),
      value: processSettingValue(updatedSetting)
    };

    return apiHandler.success(responseData, 'Setting updated successfully');

  } catch (error) {
    console.error('Update setting error:', error);
    return apiHandler.handleError(error);
  }
}

// DELETE /api/settings/[id] - Delete setting (only if not system critical)
async function deleteSettingHandler(
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

    // Find setting
    let setting;
    if (mongoose.Types.ObjectId.isValid(id)) {
      setting = await Setting.findById(id);
    } else {
      setting = await Setting.findOne({ key: id });
    }

    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Prevent deletion of critical system settings
    const criticalSettings = [
      'app_name',
      'company_name',
      'primary_currency',
      'usd_to_bdt_rate',
      'min_deposit',
      'device_limit_per_user',
      'enable_device_limiting'
    ];

    if (criticalSettings.includes(setting.key)) {
      return apiHandler.forbidden('Cannot delete critical system setting');
    }

    // Check if setting is editable
    if (!setting.isEditable) {
      return apiHandler.forbidden('This setting cannot be deleted');
    }

    const adminId = request.headers.get('X-Admin-Id');

    // Store setting data for audit log
    const settingData = {
      key: setting.key,
      category: setting.category,
      value: processSettingValue(setting),
      dataType: setting.dataType,
      description: setting.description
    };

    // Delete the setting
    await Setting.findByIdAndDelete(setting._id);

    // Invalidate cache after deletion
    invalidateSettingsCache();

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.delete',
      entity: 'Setting',
      entityId: setting._id.toString(),
      oldData: settingData,
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

// POST /api/settings/[id]/history - Get setting history
async function getSettingHistoryHandler(
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

  try {
    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Find setting
    let setting;
    if (mongoose.Types.ObjectId.isValid(id)) {
      setting = await Setting.findById(id);
    } else {
      setting = await Setting.findOne({ key: id });
    }

    if (!setting) {
      return apiHandler.notFound('Setting not found');
    }

    // Get query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get setting history with pagination
    const history = await SettingHistory.find({ settingId: setting._id })
      .populate('updatedBy', 'email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await SettingHistory.countDocuments({ settingId: setting._id });

    return apiHandler.success({
      history,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get setting history error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers
export const GET = withErrorHandler(getSettingHandler);
export const PUT = withErrorHandler(updateSettingHandler);
export const DELETE = withErrorHandler(deleteSettingHandler);