// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting, ISetting, SettingHistory } from '@/models/Setting';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { createSettingSchema, settingsListQuerySchema } from '@/lib/validation';
import { SettingsGroupedByCategory } from '@/types/settings';
import mongoose from 'mongoose';
import { encrypt, decrypt } from '@/lib/encryption';
import z from 'zod';

// Helper function to build settings filter
function buildSettingsFilter(params: any): any {
  const filter: any = {};

  if (params.category) {
    filter.category = params.category;
  }

  if (params.isEditable !== undefined) {
    filter.isEditable = params.isEditable;
  }

  if (params.search) {
    filter.$or = [
      { key: new RegExp(params.search, 'i') },
      { description: new RegExp(params.search, 'i') }
    ];
  }

  return filter;
}

// Helper function to process setting value (decrypt if needed)
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

// Helper function to validate setting value against validation rules
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

// GET /api/settings - List settings with filters and grouping
async function getSettingsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = settingsListQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return apiHandler.badRequest('Invalid query parameters', validationResult.error.errors);
    }

    const params = validationResult.data;
    console.log('🔍 Settings API - Query params:', params);

    // Build filter
    const filter = buildSettingsFilter(params);

    if (params.grouped) {
      // Return grouped settings by category
      const settings = await Setting.find(filter)
        .populate('updatedBy', 'email role')
        .sort({ category: 1, key: 1 })
        .lean();

      const groupedSettings: SettingsGroupedByCategory = {};
      
      settings.forEach((setting: any) => {
        const processedSetting = {
          ...setting,
          value: processSettingValue(setting as unknown as ISetting)
        };
        
        if (!groupedSettings[setting.category]) {
          groupedSettings[setting.category] = [];
        }
        groupedSettings[setting.category]!.push(processedSetting);
      });

      return apiHandler.success(groupedSettings);
    } else {
      // Return paginated settings list
      const aggregationPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'admins',
            localField: 'updatedBy',
            foreignField: '_id',
            as: 'updatedBy',
            pipeline: [{ $project: { email: 1, role: 1 } }]
          }
        },
        { $unwind: { path: '$updatedBy', preserveNullAndEmptyArrays: true } },
        ...createPaginationStages(params.page, params.limit)
      ];

      const [result] = await Setting.aggregate(aggregationPipeline);
      
      if (!result) {
        return apiHandler.success(createPaginatedResponse([], 0, params.page, params.limit));
      }

      // Process encrypted values
      const processedData = result.data.map((setting: any) => ({
        ...setting,
        value: processSettingValue(setting)
      }));

      const response = createPaginatedResponse(
        processedData,
        result.totalCount,
        params.page,
        params.limit
      );

      return apiHandler.success(response);
    }

  } catch (error) {
    console.error('Get settings error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/settings - Create new setting
async function createSettingHandler(request: NextRequest): Promise<NextResponse> {
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

    const body = await request.json();
    console.log('📝 Create setting request:', body);

    // Validate request body
    const validationResult = createSettingSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.badRequest('Invalid setting data', validationResult.error.errors);
    }

    const settingData = validationResult.data;

    // Check if setting with this key already exists
    const existingSetting = await Setting.findOne({ key: settingData.key });
    if (existingSetting) {
      return apiHandler.badRequest('Setting with this key already exists');
    }

    // Validate setting value
    if (!validateSettingValue(settingData.value, settingData.validation, settingData.dataType)) {
      return apiHandler.badRequest('Setting value does not meet validation requirements');
    }

    // Get admin ID from auth context
    const adminId = request.headers.get('x-admin-id');

    // Encrypt value if needed
    let processedValue = settingData.value;
    if (settingData.isEncrypted && settingData.value) {
      processedValue = encrypt(String(settingData.value));
    }

    // Create setting
    const setting = await Setting.create({
      ...settingData,
      value: processedValue,
      updatedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined
    });

    // Create history record
    await SettingHistory.create({
      settingId: setting._id,
      oldValue: null,
      newValue: settingData.value,
      updatedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      reason: 'Setting created',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Create audit log
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      action: 'settings.create',
      entity: 'Setting',
      entityId: setting._id,
      newData: {
        key: setting.key,
        category: setting.category,
        dataType: setting.dataType
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Populate created setting
    const populatedSetting = await Setting.findById(setting._id)
      .populate('updatedBy', 'email role')
      .lean();

    return apiHandler.created({
      ...populatedSetting,
      value: processSettingValue(populatedSetting as unknown as ISetting)
    });

  } catch (error) {
    console.error('Create setting error:', error);
    return apiHandler.handleError(error);
  }
}

// PUT /api/settings/reset - Reset settings to default values
async function resetSettingsHandler(request: NextRequest): Promise<NextResponse> {
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

    const body = await request.json();
    const { keys, reason } = body;

    // Get admin ID from auth context
    const adminId = request.headers.get('x-admin-id');

    let filter: any = {};
    if (keys && Array.isArray(keys) && keys.length > 0) {
      filter.key = { $in: keys };
    }

    // Find settings to reset
    const settings = await Setting.find(filter);
    const resetSettings: { key: string; oldValue: any; newValue: any }[] = [];

    for (const setting of settings) {
      if (setting.defaultValue !== undefined && setting.value !== setting.defaultValue) {
        const oldValue = processSettingValue(setting);
        
        // Update setting value
        let processedValue = setting.defaultValue;
        if (setting.isEncrypted && setting.defaultValue) {
          processedValue = encrypt(String(setting.defaultValue));
        }
        
        setting.value = processedValue;
        if (adminId) {
          setting.updatedBy = new mongoose.Types.ObjectId(adminId);
        }
        setting.updatedAt = new Date();
        await setting.save();

        // Create history record
        await SettingHistory.create({
          settingId: setting._id,
          oldValue: oldValue,
          newValue: setting.defaultValue,
          updatedBy: new mongoose.Types.ObjectId(adminId!),
          reason: reason || 'Reset to default',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        });

        resetSettings.push({
          key: setting.key,
          oldValue,
          newValue: setting.defaultValue
        });
      }
    }

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.reset',
      entity: 'Setting',
      newData: {
        resetCount: resetSettings.length,
        reason,
        resetKeys: resetSettings.map(s => s.key)
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'High'
    });

    return apiHandler.success({
      resetSettings,
      message: `${resetSettings.length} settings reset to default values`
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    return apiHandler.handleError(error);
  }
}

// REMOVED: Helper functions that were incorrectly exported
// These functions are moved to lib/settings-helper.ts where they belong

// Only export HTTP method handlers (this is what Next.js expects)
export const GET = withErrorHandler(getSettingsHandler);
export const POST = withErrorHandler(createSettingHandler);
export const PUT = withErrorHandler(resetSettingsHandler);