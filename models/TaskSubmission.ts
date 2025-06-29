import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskSubmission extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  submissionData: {
    proof?: string[]; // URLs to proof images/videos
    description: string;
    socialLinks?: string[];
    screenshots?: string[];
  };
  status: 'Pending' | 'Approved' | 'Rejected';
  feedback?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
  metadata?: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TaskSubmissionSchema = new Schema<ITaskSubmission>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  submissionData: {
    proof: [String],
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    socialLinks: [String],
    screenshots: [String]
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  feedback: {
    type: String,
    maxlength: 500,
    default: null
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  metadata: {
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    timestamp: String
  }
}, {
  timestamps: true,
  collection: 'taskSubmissions'
});

// Create compound indexes
TaskSubmissionSchema.index({ userId: 1, taskId: 1 });
TaskSubmissionSchema.index({ status: 1, submittedAt: -1 });
TaskSubmissionSchema.index({ reviewedBy: 1, reviewedAt: -1 });
TaskSubmissionSchema.index({ taskId: 1, status: 1 });

export const TaskSubmission = mongoose.models.TaskSubmission || mongoose.model<ITaskSubmission>('TaskSubmission', TaskSubmissionSchema);
