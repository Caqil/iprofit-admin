// app/api/notifications/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { AuditLog } from '@/models/AuditLog';
import { emailTemplates } from '@/config/email';
import mongoose from 'mongoose';

// GET /api/notifications/templates/[id] - Get single template
async function getTemplateHandler(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
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

    const templateId = params.id;

    // Check if it's a config template first
    if (emailTemplates[templateId]) {
      const configTemplate = emailTemplates[templateId];
      const template = {
        id: templateId,
        name: configTemplate.subject.replace(/{{.*?}}/g, '').replace(/[🎉✅❌💰🚨⏰🔐🎁📋🚀]/g, '').trim(),
        type: templateId.includes('kyc') ? 'KYC' :
              templateId.includes('withdrawal') || templateId.includes('deposit') ? 'Withdrawal' :
              templateId.includes('loan') ? 'Loan' :
              templateId.includes('task') ? 'Task' :
              templateId.includes('referral') ? 'Referral' : 'System',
        channel: 'email' as const,
        subject: configTemplate.subject,
        content: `Email template: ${configTemplate.template}`,
        variables: configTemplate.variables.map((variable: string) => ({
          name: variable,
          description: `${variable} variable`,
          type: 'string',
          required: true
        })),
        isActive: true,
        templateKey: configTemplate.template,
        createdAt: new Date(),
        updatedAt: new Date(),
        isConfigTemplate: true
      };

      return apiHandler.success(template);
    }

    // Check database templates
    const db = mongoose.connection.db;
    if (!db) {
      return apiHandler.internalError('Database connection not established');
    }
    const template = await db.collection('notification_templates')
      .findOne({ _id: new mongoose.Types.ObjectId(templateId) });

    if (!template) {
      return apiHandler.notFound('Template not found');
    }

    const formattedTemplate = {
      id: template._id.toString(),
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject: template.subject,
      content: template.content,
      variables: template.variables || [],
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isConfigTemplate: false
    };

    return apiHandler.success(formattedTemplate);

  } catch (error) {
    console.error('❌ Template API - Get error:', error);
    return apiHandler.internalError('Failed to fetch template');
  }
}

// PUT /api/notifications/templates/[id] - Update template
async function updateTemplateHandler(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.read'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    const templateId = params.id;

    // Check if it's a config template (can't be updated)
    if (emailTemplates[templateId]) {
      return apiHandler.badRequest('Cannot update predefined email templates from config');
    }

    const db = mongoose.connection.db;
    if (!db) {
      return apiHandler.internalError('Database connection not established');
    }
    
    // Check if template exists
    const existingTemplate = await db.collection('notification_templates')
      .findOne({ _id: new mongoose.Types.ObjectId(templateId) });

    if (!existingTemplate) {
      return apiHandler.notFound('Template not found');
    }

    // Update template
    const updateData = {
      ...body,
      updatedAt: new Date(),
      updatedBy: adminId ? new mongoose.Types.ObjectId(adminId) : null
    };

    delete updateData.id; // Remove id from update data

    const result = await db.collection('notification_templates')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(templateId) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return apiHandler.notFound('Template not found');
    }

    // Log audit
    try {
      await AuditLog.create({
        adminId,
        action: 'notifications.templates.update',
        entity: 'NotificationTemplate',
        entityId: templateId,
        status: 'Success',
        metadata: {
          templateName: body.name || existingTemplate.name,
          changes: Object.keys(body)
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    return apiHandler.success({
      message: 'Template updated successfully',
      templateId
    });

  } catch (error) {
    console.error('❌ Template API - Update error:', error);
    return apiHandler.handleError(error);
  }
}

// DELETE /api/notifications/templates/[id] - Delete template
async function deleteTemplateHandler(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.read'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const templateId = params.id;

    // Check if it's a config template (can't be deleted)
    if (emailTemplates[templateId]) {
      return apiHandler.badRequest('Cannot delete predefined email templates from config');
    }

    const db = mongoose.connection.db;
    if (!db) {
      return apiHandler.internalError('Database connection not established');
    }
    
    // Check if template exists
    const existingTemplate = await db.collection('notification_templates')
      .findOne({ _id: new mongoose.Types.ObjectId(templateId) });

    if (!existingTemplate) {
      return apiHandler.notFound('Template not found');
    }

    // Delete template
    const result = await db.collection('notification_templates')
      .deleteOne({ _id: new mongoose.Types.ObjectId(templateId) });

    if (result.deletedCount === 0) {
      return apiHandler.notFound('Template not found');
    }

    // Log audit
    try {
      await AuditLog.create({
        adminId,
        action: 'notifications.templates.delete',
        entity: 'NotificationTemplate',
        entityId: templateId,
        status: 'Success',
        metadata: {
          templateName: existingTemplate.name,
          type: existingTemplate.type,
          channel: existingTemplate.channel
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    return apiHandler.success({
      message: 'Template deleted successfully',
      templateId
    });

  } catch (error) {
    console.error('❌ Template API - Delete error:', error);
    return apiHandler.handleError(error);
  }
}

// Main route handlers
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandler(getTemplateHandler)(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandler(updateTemplateHandler)(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandler(deleteTemplateHandler)(request, { params });
}