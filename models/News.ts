import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  _id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  author: mongoose.Types.ObjectId | string;
  category: string;
  tags: string[];
  featuredImage?: string;
  status: 'Draft' | 'Published' | 'Archived';
  isSticky: boolean;
  viewCount: number;
  publishedAt?: Date;
  metadata?: {
    seoTitle?: string;
    seoDescription?: string;
    socialImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema<INews>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    default: null
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  featuredImage: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  isSticky: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: null
  },
  metadata: {
    seoTitle: String,
    seoDescription: String,
    socialImage: String
  }
}, {
  timestamps: true,
  collection: 'news'
});

NewsSchema.index({ slug: 1 });
NewsSchema.index({ status: 1 });
NewsSchema.index({ category: 1 });
NewsSchema.index({ publishedAt: -1 });
NewsSchema.index({ isSticky: -1, publishedAt: -1 });

export const News = mongoose.models.News || mongoose.model<INews>('News', NewsSchema);
