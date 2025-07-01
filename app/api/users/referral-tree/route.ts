import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Referral } from '@/models/Referral';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Validation schema for referral tree query
const referralTreeQuerySchema = z.object({
  depth: z.coerce.number().min(1).max(5).default(3), // Max 5 levels to prevent performance issues
  includeStats: z.coerce.boolean().default(true),
  format: z.enum(['tree', 'flat']).default('tree')
});

async function getUserReferralTreeHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = referralTreeQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { depth, includeStats, format } = validationResult.data;

    // Get user data
    const user = await User.findById(userId).select('name email referralCode profilePicture createdAt');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Build referral tree using recursive aggregation
    const buildReferralTree = async (referrerId: mongoose.Types.ObjectId, currentDepth: number): Promise<any[]> => {
      if (currentDepth >= depth) return [];

      const directReferrals = await Referral.aggregate([
        { $match: { referrerId: referrerId, status: { $ne: 'Cancelled' } } },
        {
          $lookup: {
            from: 'users',
            localField: 'refereeId',
            foreignField: '_id',
            as: 'referee'
          }
        },
        { $unwind: '$referee' },
        {
          $group: {
            _id: '$refereeId',
            user: { $first: '$referee' },
            totalEarnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } },
            totalReferrals: { $sum: 1 },
            paidEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Paid'] },
                  { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                  0
                ]
              }
            },
            joinedDate: { $first: '$createdAt' },
            lastBonusDate: { $max: '$createdAt' }
          }
        },
        { $sort: { joinedDate: 1 } }
      ]);

      const tree: any[] = [];
      for (const referral of directReferrals) {
        const children = await buildReferralTree(referral._id, currentDepth + 1);
        
        tree.push({
          id: referral._id,
          level: currentDepth + 1,
          user: {
            id: referral.user._id,
            name: referral.user.name,
            email: referral.user.email,
            profilePicture: referral.user.profilePicture,
            status: referral.user.status,
            kycStatus: referral.user.kycStatus
          },
          stats: includeStats ? {
            totalEarnings: referral.totalEarnings,
            paidEarnings: referral.paidEarnings,
            pendingEarnings: referral.totalEarnings - referral.paidEarnings,
            totalReferrals: referral.totalReferrals,
            joinedDate: referral.joinedDate,
            lastBonusDate: referral.lastBonusDate,
            daysSinceJoined: Math.floor((Date.now() - referral.joinedDate.getTime()) / (1000 * 60 * 60 * 24)),
            childrenCount: children.length
          } : null,
          children: children
        });
      }

      return tree;
    };

    // Get the referral tree
    const referralTree = await buildReferralTree(userId, 0);

    // Calculate tree statistics
    const calculateTreeStats = (tree: any[], level = 1): any => {
      let stats = {
        totalNodes: 0,
        totalEarnings: 0,
        paidEarnings: 0,
        pendingEarnings: 0,
        byLevel: {} as any
      };

      for (const node of tree) {
        stats.totalNodes++;
        
        if (node.stats) {
          stats.totalEarnings += node.stats.totalEarnings;
          stats.paidEarnings += node.stats.paidEarnings;
          stats.pendingEarnings += node.stats.pendingEarnings;
        }

        if (!stats.byLevel[level]) {
          stats.byLevel[level] = { count: 0, earnings: 0 };
        }
        stats.byLevel[level].count++;
        stats.byLevel[level].earnings += node.stats?.totalEarnings || 0;

        if (node.children && node.children.length > 0) {
          const childStats = calculateTreeStats(node.children, level + 1);
          stats.totalNodes += childStats.totalNodes;
          stats.totalEarnings += childStats.totalEarnings;
          stats.paidEarnings += childStats.paidEarnings;
          stats.pendingEarnings += childStats.pendingEarnings;
          
          // Merge level stats
          Object.keys(childStats.byLevel).forEach(lvl => {
            if (!stats.byLevel[lvl]) {
              stats.byLevel[lvl] = { count: 0, earnings: 0 };
            }
            stats.byLevel[lvl].count += childStats.byLevel[lvl].count;
            stats.byLevel[lvl].earnings += childStats.byLevel[lvl].earnings;
          });
        }
      }

      return stats;
    };

    // Calculate overall tree statistics
    const treeStats = calculateTreeStats(referralTree);

    // Flatten tree if requested
    const flattenTree = (tree: any[], level = 1): any[] => {
      let flattened: any[] = [];
      
      for (const node of tree) {
        flattened.push({
          ...node,
          level,
          children: undefined // Remove children for flat format
        });
        
        if (node.children && node.children.length > 0) {
          flattened = flattened.concat(flattenTree(node.children, level + 1));
        }
      }
      
      return flattened;
    };

    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        profilePicture: user.profilePicture,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      },

      tree: format === 'tree' ? referralTree : flattenTree(referralTree),
      
      stats: {
        ...treeStats,
        maxDepth: depth,
        actualDepth: Math.max(...Object.keys(treeStats.byLevel).map(Number), 0)
      },

      metadata: {
        format,
        depth,
        includeStats,
        generatedAt: new Date().toISOString(),
        totalNodes: treeStats.totalNodes
      }
    };

    return apiHandler.success(responseData);

  } catch (error) {
    console.error('Error fetching referral tree:', error);
    return apiHandler.internalError('Failed to fetch referral tree');
  }
}

export const GET = withErrorHandler(getUserReferralTreeHandler);