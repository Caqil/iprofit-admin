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
    const validationResult = createSettingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.badRequest('Invalid setting data', validationResult.error.errors);
    }

    const data = validationResult.data;
    const adminId = request.headers.get('X-Admin-Id');

    // Check if setting key already exists
    const existingSetting = await Setting.findOne({ key: data.key });
    if (existingSetting) {
      return apiHandler.conflict('Setting with this key already exists');
    }

    // Validate setting value against validation rules
    if (!validateSettingValue(data.value, data.validation, data.dataType)) {
      return apiHandler.badRequest('Setting value does not meet validation requirements');
    }

    // Encrypt value if required
    let processedValue = data.value;
    if (data.isEncrypted && data.value) {
      processedValue = encrypt(data.value);
    }

    // Create setting with new structure
    const setting = new Setting({
      category: data.category,
      key: data.key,
      value: processedValue,
      dataType: data.dataType,
      description: data.description,
      isEditable: data.isEditable,
      isEncrypted: data.isEncrypted,
      defaultValue: data.defaultValue,
      validation: data.validation,
      updatedBy: new mongoose.Types.ObjectId(adminId!)
    });

    await setting.save();

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.create',
      entity: 'Setting',
      entityId: setting._id.toString(),
      newData: { 
        key: data.key, 
        category: data.category,
        value: data.value,
        dataType: data.dataType
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium'
    });

    const populatedSetting = await Setting.findById(setting._id)
      .populate('updatedBy', 'email role')
      .lean();

    if (!populatedSetting) {
      return apiHandler.handleError(new Error('Failed to populate setting after creation'));
    }

    return apiHandler.created({
      ...populatedSetting,
      value: processSettingValue(populatedSetting as unknown as ISetting)
    });

  } catch (error) {
    console.error('Create setting error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/settings/bulk-update - Bulk update settings
async function bulkUpdateSettingsHandler(request: NextRequest): Promise<NextResponse> {
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
    const { settings, reason } = body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return apiHandler.badRequest('Settings array is required');
    }

    if (settings.length > 50) {
      return apiHandler.badRequest('Cannot update more than 50 settings at once');
    }

    const adminId = request.headers.get('X-Admin-Id');
    const updatedSettings: any[] = [];
    const errors: any[] = [];

    // Start a session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        for (const settingUpdate of settings) {
          try {
            const { key, value } = settingUpdate;

            // Find the setting
            const existingSetting = await Setting.findOne({ key }).session(session);
            if (!existingSetting) {
              errors.push({ key, error: 'Setting not found' });
              continue;
            }

            // Check if setting is editable
            if (!existingSetting.isEditable) {
              errors.push({ key, error: 'Setting is not editable' });
              continue;
            }

            // Validate the new value
            if (!validateSettingValue(value, existingSetting.validation, existingSetting.dataType)) {
              errors.push({ key, error: 'Value does not meet validation requirements' });
              continue;
            }

            // Store old value for history
            const oldValue = processSettingValue(existingSetting);

            // Encrypt new value if needed
            let processedValue = value;
            if (existingSetting.isEncrypted && value) {
              processedValue = encrypt(value);
            }

            // Update the setting
            const updatedSetting = await Setting.findByIdAndUpdate(
              existingSetting._id,
              {
                value: processedValue,
                updatedBy: new mongoose.Types.ObjectId(adminId!)
              },
              { new: true, session }
            ).populate('updatedBy', 'email role');

            // Create history record
            await SettingHistory.create([{
              settingId: existingSetting._id,
              oldValue: oldValue,
              newValue: value,
              updatedBy: new mongoose.Types.ObjectId(adminId!),
              reason: reason || 'Bulk update',
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }], { session });

            if (updatedSetting) {
              updatedSettings.push({
                ...updatedSetting.toObject(),
                value: processSettingValue(updatedSetting)
              });
            } else {
              errors.push({ key, error: 'Failed to update setting' });
            }

          } catch (error) {
            console.error(`Error updating setting ${settingUpdate.key}:`, error);
            errors.push({ 
              key: settingUpdate.key, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      });

      // Create audit log for bulk update
      await AuditLog.create({
        adminId: new mongoose.Types.ObjectId(adminId!),
        action: 'settings.bulk_update',
        entity: 'Setting',
        newData: {
          updatedCount: updatedSettings.length,
          errorCount: errors.length,
          reason,
          updatedKeys: updatedSettings.map(s => s.key)
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        severity: 'High'
      });

      return apiHandler.success({
        updated: updatedSettings,
        errors,
        summary: {
          total: settings.length,
          successful: updatedSettings.length,
          failed: errors.length
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Bulk update settings error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/settings/reset - Reset settings to default values
async function resetSettingsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'settings.update'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const { keys, reason } = body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return apiHandler.badRequest('Setting keys array is required');
    }

    const adminId = request.headers.get('X-Admin-Id');
    const resetSettings: { key: any; oldValue: any; newValue: any }[] = [];

    for (const key of keys) {
      const setting = await Setting.findOne({ key });
      if (!setting) {
        continue;
      }

      if (!setting.isEditable) {
        continue;
      }

      if (setting.defaultValue !== undefined) {
        const oldValue = processSettingValue(setting);
        
        // Encrypt default value if needed
        let processedDefaultValue = setting.defaultValue;
        if (setting.isEncrypted && setting.defaultValue) {
          processedDefaultValue = encrypt(setting.defaultValue);
        }

        // Update to default value
        await Setting.findByIdAndUpdate(setting._id, {
          value: processedDefaultValue,
          updatedBy: new mongoose.Types.ObjectId(adminId!)
        });

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

// Helper function to get settings by category
async function getSettingsByCategory(category: string): Promise<any[]> {
  const settings = await Setting.find({ category })
    .populate('updatedBy', 'email role')
    .sort({ key: 1 })
    .lean();
    
  return settings.map(setting => ({
    ...setting,
    value: processSettingValue(setting as unknown as ISetting)
  }));
}

// Helper function to get specific setting value
async function getSettingValue(key: string): Promise<any> {
  const setting = await Setting.findOne({ key }).lean();
  if (!setting) return null;
  return processSettingValue(setting as unknown as ISetting);
}

// Export handlers
export const GET = withErrorHandler(getSettingsHandler);
export const POST = withErrorHandler(createSettingHandler);

// Export helper functions for use in other parts of the application
export { getSettingsByCategory, getSettingValue, processSettingValue };