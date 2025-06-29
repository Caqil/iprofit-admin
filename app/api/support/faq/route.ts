// app/api/faq/route.ts - Complete FAQ API Implementation
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FAQ } from '@/models/SupportTicket';
import { Admin } from '@/models/Admin';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { FilterParams, PaginationParams, ListResponse } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';
import { faqFilterSchema, faqCreateSchema } from '@/lib/validation';


// Helper function to build FAQ filter query
function buildFAQFilter(params: any) {
  const filter: any = {};

  if (params.category) {
    filter.category = new RegExp(params.category, 'i');
  }

  if (params.isActive !== undefined) {
    filter.isActive = params.isActive === 'true';
  }

  if (params.createdBy) {
    filter.createdBy = mongoose.Types.ObjectId.isValid(params.createdBy) 
      ? new mongoose.Types.ObjectId(params.createdBy) 
      : null;
  }

  if (params.minViews !== undefined) {
    filter.viewCount = { $gte: params.minViews };
  }

  // Tags filter
  if (params.tags) {
    const tagArray = params.tags.split(',').map((tag: string) => tag.trim());
    filter.tags = { $in: tagArray };
  }

  // Search filter
  if (params.search) {
    filter.$or = [
      { question: { $regex: params.search, $options: 'i' } },
      { answer: { $regex: params.search, $options: 'i' } },
      { category: { $regex: params.search, $options: 'i' } },
      { tags: { $in: [new RegExp(params.search, 'i')] } }
    ];
  }

  return filter;
}

// Helper function to format FAQ response
function formatFAQResponse(faq: any) {
  return {
    id: String(faq._id),
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    tags: faq.tags || [],
    priority: faq.priority || 0,
    isActive: faq.isActive,
    viewCount: faq.viewCount || 0,
    helpfulCount: faq.helpfulCount || 0,
    notHelpfulCount: faq.notHelpfulCount || 0,
    helpfulnessRatio: calculateHelpfulnessRatio(faq.helpfulCount || 0, faq.notHelpfulCount || 0),
    createdBy: {
      id: faq.createdBy?._id?.toString(),
      name: faq.createdBy?.name,
      email: faq.createdBy?.email
    },
    updatedBy: {
      id: faq.updatedBy?._id?.toString(),
      name: faq.updatedBy?.name,
      email: faq.updatedBy?.email
    },
    createdAt: faq.createdAt,
    updatedAt: faq.updatedAt
  };
}

// Helper function to calculate helpfulness ratio
function calculateHelpfulnessRatio(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  if (total === 0) return 0;
  return Math.round((helpful / total) * 100);
}

// GET /api/faq - List FAQs with filtering and pagination
async function getFAQsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions (optional for public access)
  const authResult = await authMiddleware(request, {
    requireAuth: false, // Allow public access
    allowedUserTypes: ['admin', 'user'],
    requiredPermission: undefined
  });

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = faqFilterSchema.safeParse(queryParams);

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
      sortBy = 'priority',
      sortOrder = 'desc',
      ...filterParams
    } = validationResult.data;

    console.log('❓ FAQ API - Request params:', validationResult.data);

    // Build filter query
    const filter = buildFAQFilter(filterParams);

    // For public access, only show active FAQs
    if (!authResult) {
      filter.isActive = true;
    }

    // Get total count for pagination
    const total = await FAQ.countDocuments(filter);

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      
      // Lookup creator information
      {
        $lookup: {
          from: 'admins',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1
              }
            }
          ]
        }
      },
      
      // Lookup updater information
      {
        $lookup: {
          from: 'admins',
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedBy',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1
              }
            }
          ]
        }
      },
      
      // Unwind arrays to objects
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$updatedBy',
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
    const faqs = await FAQ.aggregate(pipeline);


    // Format response data
    const formattedFAQs = faqs.map(formatFAQResponse);

    // Get additional statistics
    const stats = await getFAQStats(filter);

    const response: ListResponse<typeof formattedFAQs[0]> = {
      success: true,
      data: formattedFAQs,
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

    // Log audit (only for authenticated users)
    if (authResult === null) {
      await AuditLog.create({
        adminId: request.headers.get('x-user-id') || null,
        action: 'faq.list',
        entity: 'FAQ',
        status: 'Success',
        metadata: {
          filters: filterParams,
          resultCount: formattedFAQs.length,
          isPublicAccess: !authResult
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    }

    return apiHandler.success(response);

  } catch (error) {
    console.error('FAQ fetch error:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'faq.list',
      entity: 'FAQ',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      severity: 'Medium',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to fetch FAQs');
  }
}

// POST /api/faq - Create new FAQ
async function createFAQHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.create'
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
    const validationResult = faqCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const faqData = validationResult.data;

    // Check for duplicate questions
    const existingFAQ = await FAQ.findOne({
      question: new RegExp(`^${faqData.question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (existingFAQ) {
      return apiHandler.conflict('FAQ with similar question already exists');
    }

    // Create FAQ
    const faq = await FAQ.create({
      ...faqData,
      createdBy: adminId,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0
    });

    // Populate creator information
    await faq.populate('createdBy', 'name email');

    const response = formatFAQResponse(faq);

    // Log audit
    await AuditLog.create({
      adminId: adminId || null,
      action: 'faq.create',
      entity: 'FAQ',
      entityId: String(faq._id),
      newData: {
        question: faqData.question,
        category: faqData.category,
        priority: faqData.priority
      },
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error creating FAQ:', error);
    
    // Log audit error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'faq.create',
      entity: 'FAQ',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Creation failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to create FAQ');
  }
}

// Helper function to get FAQ statistics
async function getFAQStats(filter: any) {
  try {
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFAQs: { $sum: 1 },
          activeFAQs: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactiveFAQs: {
            $sum: { $cond: ['$isActive', 0, 1] }
          },
          totalViews: { $sum: '$viewCount' },
          totalHelpful: { $sum: '$helpfulCount' },
          totalNotHelpful: { $sum: '$notHelpfulCount' },
          averageViews: { $avg: '$viewCount' },
          averagePriority: { $avg: '$priority' },
          uniqueCategories: { $addToSet: '$category' },
          uniqueCreators: { $addToSet: '$createdBy' }
        }
      }
    ];

    const [stats] = await FAQ.aggregate(pipeline);

    if (!stats) {
      return {
        totalFAQs: 0,
        activeFAQs: 0,
        inactiveFAQs: 0,
        totalViews: 0,
        totalHelpful: 0,
        totalNotHelpful: 0,
        averageViews: 0,
        averagePriority: 0,
        uniqueCategories: 0,
        uniqueCreators: 0,
        helpfulnessRatio: 0
      };
    }

    const totalFeedback = stats.totalHelpful + stats.totalNotHelpful;
    const helpfulnessRatio = totalFeedback > 0 
      ? Math.round((stats.totalHelpful / totalFeedback) * 100) 
      : 0;

    return {
      totalFAQs: stats.totalFAQs,
      activeFAQs: stats.activeFAQs,
      inactiveFAQs: stats.inactiveFAQs,
      totalViews: stats.totalViews,
      totalHelpful: stats.totalHelpful,
      totalNotHelpful: stats.totalNotHelpful,
      averageViews: Math.round(stats.averageViews || 0),
      averagePriority: Math.round((stats.averagePriority || 0) * 10) / 10,
      uniqueCategories: stats.uniqueCategories.length,
      uniqueCreators: stats.uniqueCreators.filter(Boolean).length,
      helpfulnessRatio
    };
  } catch (error) {
    console.error('Error calculating FAQ stats:', error);
    return null;
  }
}

// Export handlers with error handling
export const GET = withErrorHandler(getFAQsHandler);
export const POST = withErrorHandler(createFAQHandler);