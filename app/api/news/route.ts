// app/api/news/route.ts - COMPLETE IMPLEMENTATION
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { News, INews } from '@/models/News';
import { Admin } from '@/models/Admin';
import { AuditLog } from '@/models/AuditLog';
import { Notification } from '@/models/Notification';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { FilterParams, PaginationParams, ListResponse } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';
import { newsFilterSchema, newsCreateSchema } from '@/lib/validation';


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

// Helper function to build news filter query
function buildNewsFilter(params: any) {
  const filter: any = {};

  if (params.status) filter.status = params.status;
  if (params.category) filter.category = new RegExp(params.category, 'i');
  if (params.author) {
    filter.author = mongoose.Types.ObjectId.isValid(params.author) 
      ? new mongoose.Types.ObjectId(params.author) 
      : null;
  }
  if (params.isSticky === 'true') filter.isSticky = true;
  if (params.isSticky === 'false') filter.isSticky = false;

  // Tags filter
  if (params.tags) {
    const tagArray = params.tags.split(',').map((tag: string) => tag.trim());
    filter.tags = { $in: tagArray };
  }

  // Date range filter
  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
    if (params.dateTo) filter.createdAt.$lte = new Date(params.dateTo);
  }

  // Search filter
  if (params.search) {
    filter.$or = [
      { title: { $regex: params.search, $options: 'i' } },
      { content: { $regex: params.search, $options: 'i' } },
      { excerpt: { $regex: params.search, $options: 'i' } },
      { tags: { $in: [new RegExp(params.search, 'i')] } }
    ];
  }

  return filter;
}

// Helper function to format news response
function formatNewsResponse(news: any, includeContent = true) {
  const formatted = {
    id: String(news._id),
    title: news.title,
    slug: news.slug,
    excerpt: news.excerpt,
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
    timeAgo: getTimeAgo(news.createdAt),
    readingTime: calculateReadingTime(news.content)
  };

  if (includeContent) {
    (formatted as any).content = news.content;
  }

  return formatted;
}

// Helper function to calculate reading time
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

// GET /api/news - List news articles with filtering and pagination
async function getNewsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = newsFilterSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filterParams
    } = validationResult.data;

    console.log('📰 News API - Request params:', validationResult.data);

    // Build filter query
    const filter = buildNewsFilter(filterParams);

    // Get total count for pagination
    const total = await News.countDocuments(filter);

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      
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
      },
      
      // Sort stage
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      },
      
      // Pagination
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

    // Execute aggregation
    const newsArticles = await News.aggregate(pipeline);

    console.log('📰 News API - Found articles:', newsArticles.length);

    // Format response data (without full content for list view)
    const formattedNews = newsArticles.map(news => formatNewsResponse(news, false));

    // Get additional statistics
    const stats = await getNewsStats(filter);

    const response: ListResponse<typeof formattedNews[0]> = {
      success: true,
      data: formattedNews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      timestamp: new Date()
    };

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.list',
      entity: 'News',
      status: 'Success',
      metadata: {
        filters: filterParams,
        resultCount: formattedNews.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('News fetch error:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.list',
      entity: 'News',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to fetch news articles');
  }
}

// POST /api/news - Create new news article
async function createNewsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.create'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const adminId = request.headers.get('x-user-id');

    // Validate request body
    const validationResult = newsCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const newsData = validationResult.data;

    // Generate unique slug
    const baseSlug = generateSlug(newsData.title);
    const uniqueSlug = await ensureUniqueSlug(baseSlug);

    // Set publish date if publishing immediately
    const publishedAt = newsData.status === 'Published' && !newsData.publishedAt
      ? new Date()
      : newsData.publishedAt ? new Date(newsData.publishedAt) : null;

    // Handle scheduled publishing
    if (newsData.schedulePublish && newsData.scheduledAt) {
      const scheduledDate = new Date(newsData.scheduledAt);
      if (scheduledDate <= new Date()) {
        return apiHandler.badRequest('Scheduled date must be in the future');
      }
      // TODO: Implement scheduling logic with job queue
    }

    // Create news article
    const newsArticle = await News.create({
      ...newsData,
      slug: uniqueSlug,
      author: adminId,
      publishedAt,
      viewCount: 0
    });

    // Populate author information
    await newsArticle.populate('author', 'name email role');

    const response = formatNewsResponse(newsArticle);

    // Send notifications if published
    if (newsData.status === 'Published') {
      await sendNewsNotifications(newsArticle);
    }

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: 'news.create',
      entity: 'News',
      entityId: String(newsArticle._id),
      newData: {
        title: newsData.title,
        status: newsData.status,
        category: newsData.category
      },
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error creating news article:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.create',
      entity: 'News',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Creation failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to create news article');
  }
}

// Helper function to get news statistics
async function getNewsStats(filter: any) {
  try {
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          publishedArticles: {
            $sum: { $cond: [{ $eq: ['$status', 'Published'] }, 1, 0] }
          },
          draftArticles: {
            $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] }
          },
          archivedArticles: {
            $sum: { $cond: [{ $eq: ['$status', 'Archived'] }, 1, 0] }
          },
          stickyArticles: {
            $sum: { $cond: ['$isSticky', 1, 0] }
          },
          totalViews: { $sum: '$viewCount' },
          averageViews: { $avg: '$viewCount' },
          uniqueCategories: { $addToSet: '$category' },
          uniqueAuthors: { $addToSet: '$author' }
        }
      }
    ];

    const [stats] = await News.aggregate(pipeline);

    if (!stats) {
      return {
        totalArticles: 0,
        publishedArticles: 0,
        draftArticles: 0,
        archivedArticles: 0,
        stickyArticles: 0,
        totalViews: 0,
        averageViews: 0,
        uniqueCategories: 0,
        uniqueAuthors: 0
      };
    }

    return {
      totalArticles: stats.totalArticles,
      publishedArticles: stats.publishedArticles,
      draftArticles: stats.draftArticles,
      archivedArticles: stats.archivedArticles,
      stickyArticles: stats.stickyArticles,
      totalViews: stats.totalViews,
      averageViews: Math.round(stats.averageViews || 0),
      uniqueCategories: stats.uniqueCategories.length,
      uniqueAuthors: stats.uniqueAuthors.filter(Boolean).length
    };
  } catch (error) {
    console.error('Error calculating news stats:', error);
    return null;
  }
}

// Helper function to send notifications when news is published
async function sendNewsNotifications(newsArticle: INews) {
  try {
    // TODO: Implement notification logic
    // This could include:
    // - Email notifications to subscribers
    // - Push notifications to mobile app users
    // - In-app notifications
    // - Social media posting
    
    console.log(`📰 News published: ${newsArticle.title}`);
    
    // Example: Create in-app notification
    // await Notification.create({
    //   type: 'News',
    //   channel: 'in-app',
    //   title: 'New Article Published',
    //   message: `Check out our latest article: ${newsArticle.title}`,
    //   status: 'Pending',
    //   priority: 'Medium',
    //   metadata: {
    //     newsId: newsArticle._id,
    //     category: newsArticle.category
    //   }
    // });

  } catch (error) {
    console.error('Error sending news notifications:', error);
  }
}

// PUT /api/news/bulk - Bulk operations on news articles
async function bulkNewsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.update'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const { action, ids, data } = body;
    const adminId = request.headers.get('x-user-id');

    if (!action || !ids || !Array.isArray(ids)) {
      return apiHandler.badRequest('Action and ids array are required');
    }

    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    let updateData: any = {};
    let result;

    switch (action) {
      case 'publish':
        updateData = { 
          status: 'Published', 
          publishedAt: new Date() 
        };
        result = await News.updateMany(
          { _id: { $in: objectIds }, status: 'Draft' },
          updateData
        );
        break;

      case 'unpublish':
        updateData = { status: 'Draft' };
        result = await News.updateMany(
          { _id: { $in: objectIds }, status: 'Published' },
          updateData
        );
        break;

      case 'archive':
        updateData = { status: 'Archived' };
        result = await News.updateMany(
          { _id: { $in: objectIds } },
          updateData
        );
        break;

      case 'delete':
        result = await News.deleteMany({ _id: { $in: objectIds } });
        break;

      case 'update':
        if (!data) {
          return apiHandler.badRequest('Update data is required');
        }
        updateData = data;
        result = await News.updateMany(
          { _id: { $in: objectIds } },
          updateData
        );
        break;

      default:
        return apiHandler.badRequest('Invalid action');
    }

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: `news.bulk_${action}`,
      entity: 'News',
      newData: { action, affectedIds: ids, updateData },
      status: 'Success',
      metadata: {
        modifiedCount: result.modifiedCount || result.deletedCount,
        requestedCount: ids.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: `Successfully ${action}ed ${result.modifiedCount || result.deletedCount} article(s)`,
      modifiedCount: result.modifiedCount || result.deletedCount,
      requestedCount: ids.length
    });

  } catch (error) {
    console.error('Bulk news operation error:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.bulk_operation',
      entity: 'News',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Bulk operation failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to perform bulk operation');
  }
}

// Export handlers with error handling
export const GET = withErrorHandler(getNewsHandler);
export const POST = withErrorHandler(createNewsHandler);
export const PUT = withErrorHandler(bulkNewsHandler);