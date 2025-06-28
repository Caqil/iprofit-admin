import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  ticketNumber: string;
  subject: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Waiting for User' | 'Resolved' | 'Closed';
  assignedTo?: string;
  attachments: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
  responses: {
    message: string;
    isAdminResponse: boolean;
    adminId?: string;
    attachments?: {
      filename: string;
      url: string;
      mimeType: string;
      size: number;
    }[];
    createdAt: Date;
  }[];
  tags: string[];
  resolution?: string;
  satisfactionRating?: number;
  feedbackComment?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  lastResponseAt: Date;
  responseTime?: number; // in minutes
  resolutionTime?: number; // in minutes
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IFAQ extends Document {
  _id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: number;
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'],
    default: 'Open'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  responses: [{
    message: {
      type: String,
      required: true
    },
    isAdminResponse: {
      type: Boolean,
      required: true
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    attachments: [{
      filename: String,
      url: String,
      mimeType: String,
      size: Number
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String
  }],
  resolution: {
    type: String,
    default: null
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedbackComment: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  lastResponseAt: {
    type: Date,
    default: Date.now
  },
  responseTime: {
    type: Number,
    default: null
  },
  resolutionTime: {
    type: Number,
    default: null
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: String
  }
}, {
  timestamps: true,
  collection: 'support_tickets'
});

const FAQSchema = new Schema<IFAQ>({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true,
  collection: 'faqs'
});

SupportTicketSchema.index({ userId: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ priority: 1 });
SupportTicketSchema.index({ category: 1 });
SupportTicketSchema.index({ assignedTo: 1 });
SupportTicketSchema.index({ createdAt: -1 });

FAQSchema.index({ category: 1 });
FAQSchema.index({ isActive: 1 });
FAQSchema.index({ priority: -1 });

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export const FAQ = mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema);
