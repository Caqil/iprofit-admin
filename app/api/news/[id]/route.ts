// app/api/news/[id]/route.ts - FIXED IMPLEMENTATION
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { News, INews } from '@/models/News';
import { Admin } from '@/models/Admin';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';
import { newsPatchSchema, newsUpdateSchema } from '@/lib/validation';


// Helper function to generate URL slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, 100); // Limit length
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existingNews = await News.findOne({
      slug,
      ...(excludeId && { _id: { $ne: excludeId } })
    });
    
    if (!existingNews) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Helper function to format news response
function formatNewsResponse(news: any) {
  return {
    id: String(news._id),
    title: news.title,
    content: news.content,
    excerpt: news.excerpt,
    slug: news.slug,
    category: news.category,
    tags: news.tags || [],
    featuredImage: news.featuredImage,
    status: news.status,
    isSticky: news.isSticky,
    viewCount: news.viewCount || 0,
    publishedAt: news.publishedAt,
    author: {
      id: news.author?._id?.toString(),
      name: news.author?.name,
      email: news.author?.email,
      role: news.author?.role
    },
    metadata: news.metadata,
    createdAt: news.createdAt,
    updatedAt: news.updatedAt,
    readingTime: calculateReadingTime(news.content || ''),
    wordCount: countWords(news.content || '')
  };
}

// Helper function to calculate reading time
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(words / wordsPerMinute);
}

// Helper function to count words
function countWords(content: string): number {
  return content.split(/\s+/).filter(word => word.length > 0).length;
}

// GET /api/news/[id] - Get specific news article
async function getNewsArticleHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.view'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;

    // Validate news ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid news ID format');
    }

    // Build aggregation pipeline to include author details
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      
      // Lookup author information
      {
        $lookup: {
          from: 'admins',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1
              }
            }
          ]
        }
      },
      
      // Unwind author array to object
      {
        $unwind: {
          path: '$author',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    const [newsArticle] = await News.aggregate(pipeline);

    if (!newsArticle) {
      return apiHandler.notFound('News article not found');
    }

    const response = formatNewsResponse(newsArticle);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.view',
      entity: 'News',
      entityId: id,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error fetching news article:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.view',
      entity: 'News',
      entityId: params.id,
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Fetch failed',
      severity: 'Medium',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to fetch news article');
  }
}

// PUT /api/news/[id] - Update specific news article
async function updateNewsArticleHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.update'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate news ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid news ID format');
    }

    const body = await request.json();

    // Validate request body
    const validationResult = newsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const updateData = validationResult.data;

    // Get the existing news article
    const existingNews = await News.findById(id);
    if (!existingNews) {
      return apiHandler.notFound('News article not found');
    }

    // Store old data for audit
    const oldData = {
      title: existingNews.title,
      status: existingNews.status,
      category: existingNews.category,
      isSticky: existingNews.isSticky,
      publishedAt: existingNews.publishedAt,
      slug: existingNews.slug
    };

    // Check if title is being changed and update slug if needed
    let updatedSlug = existingNews.slug;
    if (updateData.title && updateData.title !== existingNews.title) {
      const baseSlug = generateSlug(updateData.title);
      updatedSlug = await ensureUniqueSlug(baseSlug, id);
    }

    // Handle status changes
    const finalUpdateData: any = { ...updateData };
    
    // Set publishedAt when status changes to Published
    if (updateData.status === 'Published' && existingNews.status !== 'Published') {
      finalUpdateData.publishedAt = updateData.publishedAt 
        ? new Date(updateData.publishedAt) 
        : new Date();
    }

    // Clear publishedAt when status changes from Published to Draft
    if (updateData.status === 'Draft' && existingNews.status === 'Published') {
      finalUpdateData.publishedAt = null;
    }

    // Add slug to update data if changed
    if (updatedSlug !== existingNews.slug) {
      finalUpdateData.slug = updatedSlug;
    }

    // Update the news article
    const updatedNews = await News.findByIdAndUpdate(
      id,
      { $set: finalUpdateData },
      { new: true, runValidators: true }
    ).populate('author', 'name email role');

    if (!updatedNews) {
      return apiHandler.notFound('News article not found');
    }

    const response = formatNewsResponse(updatedNews);

    // Log audit with changes
    const changes = Object.keys(updateData).map(field => ({
      field,
      oldValue: (oldData as any)[field],
      newValue: (updateData as any)[field]
    })).filter(change => change.oldValue !== change.newValue);

    await AuditLog.create({
      adminId: adminId || null,
      action: 'news.update',
      entity: 'News',
      entityId: id,
      oldData,
      newData: updateData,
      changes,
      status: 'Success',
      metadata: {
        titleChanged: updateData.title !== existingNews.title,
        statusChanged: updateData.status !== existingNews.status,
        slugChanged: updatedSlug !== existingNews.slug
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error updating news article:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.update',
      entity: 'News',
      entityId: params.id,
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Update failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to update news article');
  }
}

// DELETE /api/news/[id] - Delete specific news article
async function deleteNewsArticleHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.delete'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate news ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid news ID format');
    }

    // Get the existing news article for audit
    const existingNews = await News.findById(id);
    if (!existingNews) {
      return apiHandler.notFound('News article not found');
    }

    // Store data for audit
    const deletedData = {
      title: existingNews.title,
      status: existingNews.status,
      category: existingNews.category,
      author: existingNews.author,
      createdAt: existingNews.createdAt
    };

    // Delete the news article
    await News.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: 'news.delete',
      entity: 'News',
      entityId: id,
      oldData: deletedData,
      status: 'Success',
      metadata: {
        deletedTitle: existingNews.title,
        deletedStatus: existingNews.status
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: 'News article deleted successfully',
      deletedId: id,
      deletedTitle: existingNews.title
    });

  } catch (error) {
    console.error('Error deleting news article:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.delete',
      entity: 'News',
      entityId: params.id,
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Deletion failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to delete news article');
  }
}

// PATCH /api/news/[id] - Partial update operations (publish, unpublish, etc.)
async function patchNewsArticleHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.update'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate news ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid news ID format');
    }

    const body = await request.json();

    // Validate patch request body
    const validationResult = newsPatchSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { action, data } = validationResult.data;

    // Get the existing news article
    const existingNews = await News.findById(id);
    if (!existingNews) {
      return apiHandler.notFound('News article not found');
    }

    let updateData: any = {};
    let actionPerformed = '';

    switch (action) {
      case 'publish':
        if (existingNews.status === 'Published') {
          return apiHandler.badRequest('Article is already published');
        }
        updateData = { 
          status: 'Published', 
          publishedAt: new Date() 
        };
        actionPerformed = 'published';
        break;

      case 'unpublish':
        if (existingNews.status !== 'Published') {
          return apiHandler.badRequest('Article is not published');
        }
        updateData = { 
          status: 'Draft',
          publishedAt: null
        };
        actionPerformed = 'unpublished';
        break;

      case 'archive':
        updateData = { status: 'Archived' };
        actionPerformed = 'archived';
        break;

      case 'unarchive':
        if (existingNews.status !== 'Archived') {
          return apiHandler.badRequest('Article is not archived');
        }
        updateData = { status: 'Draft' };
        actionPerformed = 'unarchived';
        break;

      case 'stick':
        updateData = { isSticky: true };
        actionPerformed = 'made sticky';
        break;

      case 'unstick':
        updateData = { isSticky: false };
        actionPerformed = 'removed sticky';
        break;

      case 'increment_view':
        updateData = { $inc: { viewCount: 1 } };
        actionPerformed = 'incremented view count';
        break;

      case 'update_metadata':
        if (!data || !data.metadata) {
          return apiHandler.badRequest('Metadata is required for update_metadata action');
        }
        updateData = { metadata: data.metadata };
        actionPerformed = 'updated metadata';
        break;

      case 'update_tags':
        if (!data || !Array.isArray(data.tags)) {
          return apiHandler.badRequest('Tags array is required for update_tags action');
        }
        updateData = { tags: data.tags };
        actionPerformed = 'updated tags';
        break;

      default:
        return apiHandler.badRequest('Invalid action. Supported actions: publish, unpublish, archive, unarchive, stick, unstick, increment_view, update_metadata, update_tags');
    }

    // Store old data for audit
    const oldData = {
      status: existingNews.status,
      isSticky: existingNews.isSticky,
      viewCount: existingNews.viewCount,
      tags: existingNews.tags,
      metadata: existingNews.metadata,
      publishedAt: existingNews.publishedAt
    };

    // Update the news article
    const updatedNews = await News.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email role');

    if (!updatedNews) {
      return apiHandler.notFound('News article not found');
    }

    const response = formatNewsResponse(updatedNews);

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: `news.${action}`,
      entity: 'News',
      entityId: id,
      oldData,
      newData: updateData,
      changes: [{
        field: action,
        oldValue: oldData,
        newValue: updateData
      }],
      status: 'Success',
      metadata: {
        action: actionPerformed,
        title: existingNews.title
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      ...response,
      message: `Article ${actionPerformed} successfully`
    });

  } catch (error) {
    console.error('Error performing news action:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.patch',
      entity: 'News',
      entityId: params.id,
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Action failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to perform news action');
  }
}

// Export handlers with error handling
export const GET = withErrorHandler(getNewsArticleHandler);
export const PUT = withErrorHandler(updateNewsArticleHandler);
export const DELETE = withErrorHandler(deleteNewsArticleHandler);
export const PATCH = withErrorHandler(patchNewsArticleHandler);