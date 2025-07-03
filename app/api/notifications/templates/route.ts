// app/api/notifications/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { AuditLog } from '@/models/AuditLog';
import { emailTemplates } from '@/config/email';
import mongoose from 'mongoose';

// Transform email templates to notification template format
function transformEmailTemplateToNotificationTemplate(key: string, template: any) {
  // Map template types based on key
  const getTypeFromKey = (key: string) => {
    if (key.includes('kyc')) return 'KYC';
    if (key.includes('withdrawal') || key.includes('deposit')) return 'Withdrawal';
    if (key.includes('loan')) return 'Loan';
    if (key.includes('task')) return 'Task';
    if (key.includes('referral')) return 'Referral';
    if (key.includes('login') || key.includes('security')) return 'System';
    return 'System';
  };

  // Map channels (most templates are email, but can be extended)
  const getChannelFromKey = (key: string) => {
    if (key.includes('sms')) return 'sms';
    if (key.includes('push')) return 'push';
    return 'email';
  };

  return {
    id: key,
    name: template.subject.replace(/{{.*?}}/g, '').replace(/[🎉✅❌💰🚨⏰🔐🎁📋🚀]/g, '').trim(),
    type: getTypeFromKey(key),
    channel: getChannelFromKey(key),
    subject: template.subject,
    content: `Email template: ${template.template}`,
    variables: template.variables.map((variable: string) => ({
      name: variable,
      description: `${variable} variable`,
      type: 'string',
      required: true
    })),
    isActive: true,
    templateKey: template.template,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// GET /api/notifications/templates - Get all templates
async function getTemplatesHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const channel = url.searchParams.get('channel');
    const isActive = url.searchParams.get('isActive');

    // Transform email templates from config
    let templates = Object.entries(emailTemplates).map(([key, template]) => 
      transformEmailTemplateToNotificationTemplate(key, template)
    );

    // Check for additional templates in database (if any exist)
    try {
      const db = mongoose.connection.db;
      if (db) {
        const dbTemplates = await db.collection('notification_templates').find({ isActive: true }).toArray();
        
        // Add database templates if they exist
        if (dbTemplates.length > 0) {
          const formattedDbTemplates = dbTemplates.map(template => ({
            id: template._id.toString(),
            name: template.name,
            type: template.type,
            channel: template.channel,
            subject: template.subject,
            content: template.content,
            variables: template.variables || [],
            isActive: template.isActive,
            templateKey: template.templateKey || '', // Add templateKey, fallback to empty string if not present
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
          }));
          templates = [...templates, ...formattedDbTemplates];
        }
      } else {
        console.warn('Database connection is not available when fetching notification templates.');
      }
    } catch (dbError) {
      console.warn('Could not fetch database templates:', dbError);
      // Continue with config templates only
    }

    // Apply filters
    if (type) {
      templates = templates.filter(template => template.type === type);
    }

    if (channel) {
      templates = templates.filter(template => template.channel === channel);
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      templates = templates.filter(template => template.isActive === activeFilter);
    }

    console.log('📋 Templates API - Found templates:', templates.length);

    // Log audit
    try {
      await AuditLog.create({
        adminId: request.headers.get('x-user-id'),
        action: 'notifications.templates.list',
        entity: 'NotificationTemplate',
        status: 'Success',
        metadata: {
          filters: { type, channel, isActive },
          resultCount: templates.length,
          configTemplates: Object.keys(emailTemplates).length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    return apiHandler.success(templates);

  } catch (error) {
    console.error('❌ Templates API - Error:', error);
    return apiHandler.internalError('Failed to fetch templates');
  }
}

// POST /api/notifications/templates - Create template
async function createTemplateHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    // Basic validation
    const requiredFields = ['name', 'type', 'channel', 'content'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return apiHandler.badRequest(`Field '${field}' is required`);
      }
    }

    const db = mongoose.connection.db;
    if (!db) {
      return apiHandler.internalError('Database connection is not available');
    }
    const newTemplate = {
      name: body.name,
      type: body.type,
      channel: body.channel,
      subject: body.subject || '',
      content: body.content,
      variables: body.variables || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId ? new mongoose.Types.ObjectId(adminId) : null
    };

    // Insert into notification_templates collection
    const result = await db.collection('notification_templates').insertOne(newTemplate);
    const createdTemplate = { ...newTemplate, id: result.insertedId.toString() };

    console.log('✅ Created new template:', result.insertedId);

    // Log audit
    try {
      await AuditLog.create({
        adminId,
        action: 'notifications.templates.create',
        entity: 'NotificationTemplate',
        entityId: result.insertedId.toString(),
        status: 'Success',
        metadata: {
          templateName: newTemplate.name,
          type: newTemplate.type,
          channel: newTemplate.channel
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    return apiHandler.created({
      template: createdTemplate,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ Templates API - Create error:', error);
    return apiHandler.handleError(error);
  }
}

// Main route handlers - Only GET and POST for base route
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(getTemplatesHandler)(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(createTemplateHandler)(request);
}