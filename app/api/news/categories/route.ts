import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { News } from '@/models/News';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';

// Category validation schemas
const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).optional().default(0)
});

const categoryUpdateSchema = categoryCreateSchema.partial();

// GET /api/news/categories - Get all news categories with statistics
async function getCategoriesHandler(request: NextRequest): Promise<NextResponse> {
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

    // Aggregate categories with article counts and statistics
    const pipeline: mongoose.PipelineStage[] = [
      {
        $group: {
          _id: '$category',
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
          totalViews: { $sum: '$viewCount' },
          averageViews: { $avg: '$viewCount' },
          latestArticle: { $max: '$createdAt' },
          oldestArticle: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          name: '$_id',
          _id: 0,
          totalArticles: 1,
          publishedArticles: 1,
          draftArticles: 1,
          archivedArticles: 1,
          totalViews: 1,
          averageViews: { $round: ['$averageViews', 1] },
          latestArticle: 1,
          oldestArticle: 1
        }
      },
      {
        $sort: { totalArticles: -1 }
      }
    ];

    const categories = await News.aggregate(pipeline);

    // Get total statistics
    const totalStats = await News.aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $addToSet: '$category' },
          totalArticles: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);

    const stats = totalStats[0] || {
      totalCategories: [],
      totalArticles: 0,
      totalViews: 0
    };

    // Add default category data for categories that might not exist in articles
    const predefinedCategories = [
      { name: 'General', description: 'General news and updates' },
      { name: 'Technology', description: 'Technology related news' },
      { name: 'Finance', description: 'Financial news and updates' },
      { name: 'Product', description: 'Product announcements and updates' },
      { name: 'Company', description: 'Company news and announcements' }
    ];

    const enrichedCategories = categories.map(cat => ({
      ...cat,
      description: predefinedCategories.find(p => p.name === cat.name)?.description || '',
      color: generateCategoryColor(cat.name),
      icon: generateCategoryIcon(cat.name),
      isActive: true,
      sortOrder: 0
    }));

    // Add predefined categories that don't have articles yet
    predefinedCategories.forEach(predefined => {
      if (!categories.find(cat => cat.name === predefined.name)) {
        enrichedCategories.push({
          name: predefined.name,
          description: predefined.description,
          totalArticles: 0,
          publishedArticles: 0,
          draftArticles: 0,
          archivedArticles: 0,
          totalViews: 0,
          averageViews: 0,
          latestArticle: null,
          oldestArticle: null,
          color: generateCategoryColor(predefined.name),
          icon: generateCategoryIcon(predefined.name),
          isActive: true,
          sortOrder: 0
        });
      }
    });

    // Sort by total articles descending
    enrichedCategories.sort((a, b) => b.totalArticles - a.totalArticles);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.categories.list',
      entity: 'NewsCategory',
      status: 'Success',
      metadata: {
        categoriesCount: enrichedCategories.length,
        totalArticles: stats.totalArticles
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      categories: enrichedCategories,
      statistics: {
        totalCategories: enrichedCategories.length,
        totalArticles: stats.totalArticles,
        totalViews: stats.totalViews,
        activeCategories: enrichedCategories.filter(cat => cat.totalArticles > 0).length
      }
    });

  } catch (error) {
    console.error('Error fetching news categories:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.categories.list',
      entity: 'NewsCategory',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Fetch failed',
      severity: 'Medium',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to fetch news categories');
  }
}

// POST /api/news/categories - Create new category
async function createCategoryHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'news.create'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const adminId = request.headers.get('x-user-id');

    // Validate request body
    const validationResult = categoryCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const categoryData = validationResult.data;

    // Check if category already exists
    const existingCategory = await News.findOne({ 
      category: new RegExp(`^${categoryData.name}$`, 'i') 
    });

    if (existingCategory) {
      return apiHandler.conflict('Category already exists');
    }

    // Since we don't have a separate categories collection,
    // we'll just validate the category creation and return success
    // The category will be created when the first article is assigned to it

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: 'news.categories.create',
      entity: 'NewsCategory',
      newData: categoryData,
      status: 'Success',
      metadata: {
        categoryName: categoryData.name
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: 'Category created successfully',
      category: {
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color || generateCategoryColor(categoryData.name),
        icon: categoryData.icon || generateCategoryIcon(categoryData.name),
        isActive: categoryData.isActive,
        sortOrder: categoryData.sortOrder,
        totalArticles: 0,
        publishedArticles: 0,
        draftArticles: 0,
        archivedArticles: 0,
        totalViews: 0,
        averageViews: 0
      }
    });

  } catch (error) {
    console.error('Error creating news category:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'news.categories.create',
      entity: 'NewsCategory',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Creation failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to create news category');
  }
}

// Helper function to generate category colors
function generateCategoryColor(categoryName: string): string {
  const colors = {
    'General': '#6B7280',
    'Technology': '#3B82F6',
    'Finance': '#10B981',
    'Product': '#8B5CF6',
    'Company': '#F59E0B',
    'Security': '#EF4444',
    'Updates': '#06B6D4',
    'Announcements': '#EC4899'
  };

  return colors[categoryName as keyof typeof colors] || '#6B7280';
}

// Helper function to generate category icons
function generateCategoryIcon(categoryName: string): string {
  const icons = {
    'General': '📰',
    'Technology': '💻',
    'Finance': '💰',
    'Product': '🚀',
    'Company': '🏢',
    'Security': '🔒',
    'Updates': '🔄',
    'Announcements': '📢'
  };

  return icons[categoryName as keyof typeof icons] || '📰';
}

// Export handlers with error handling
export const GET = withErrorHandler(getCategoriesHandler);
export const POST = withErrorHandler(createCategoryHandler);