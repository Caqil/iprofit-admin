// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Setting, ISetting, SettingHistory } from '@/models/Setting';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { createSettingSchema, paginationSchema, settingsListQuerySchema } from '@/lib/validation';
import { SettingFilter, SettingsOverview, SettingsGroupedByCategory } from '@/types/settings';
import { z } from 'zod';
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

// Helper function to process setting value
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

// Helper function to validate setting value
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
          value: processSettingValue(setting)
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

    // Validate setting value
    if (!validateSettingValue(data.value, data.validation, data.dataType)) {
      return apiHandler.badRequest('Setting value does not meet validation requirements');
    }

    // Encrypt value if required
    let processedValue = data.value;
    if (data.isEncrypted && data.value) {
      processedValue = encrypt(data.value);
    }

    // Create setting
    const setting = new Setting({
      ...data,
      value: processedValue,
      updatedBy: new mongoose.Types.ObjectId(adminId!)
    });

    await setting.save();

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'settings.create',
      entity: 'Setting',
      entityId: setting._id.toString(),
      newData: { key: data.key, category: data.category },
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

// Export handlers
export const GET = withErrorHandler(getSettingsHandler);
export const POST = withErrorHandler(createSettingHandler);