import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  _id: string;
  name: string;
  description: string;
  criteria: string;
  reward: number;
  currency: 'USD' | 'BDT';
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: number; // in minutes
  instructions: string[];
  requiredProof: string[];
  status: 'Active' | 'Inactive' | 'Paused';
  maxCompletions?: number;
  currentCompletions: number;
  validFrom: Date;
  validUntil?: Date;
  isRepeatable: boolean;
  cooldownPeriod?: number; // in hours
  metadata?: {
    externalUrl?: string;
    imageUrl?: string;
    tags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskSubmission extends Document {
  _id: string;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'Pending' | 'Approved' | 'Rejected';
  proof: {
    type: string;
    content: string;
    uploadedAt: Date;
  }[];
  submissionNote?: string;
  reviewNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reward: number;
  transactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  criteria: {
    type: String,
    required: true
  },
  reward: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'BDT'],
    default: 'BDT'
  },
  category: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Easy'
  },
  estimatedTime: {
    type: Number,
    required: true,
    min: 1
  },
  instructions: [{
    type: String
  }],
  requiredProof: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Paused'],
    default: 'Active'
  },
  maxCompletions: {
    type: Number,
    default: null
  },
  currentCompletions: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    default: null
  },
  isRepeatable: {
    type: Boolean,
    default: false
  },
  cooldownPeriod: {
    type: Number,
    default: null
  },
  metadata: {
    externalUrl: String,
    imageUrl: String,
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'tasks'
});

const TaskSubmissionSchema = new Schema<ITaskSubmission>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  proof: [{
    type: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submissionNote: {
    type: String,
    default: null
  },
  reviewNote: {
    type: String,
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
  reward: {
    type: Number,
    required: true
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  }
}, {
  timestamps: true,
  collection: 'task_submissions'
});

TaskSchema.index({ status: 1 });
TaskSchema.index({ category: 1 });
TaskSchema.index({ validFrom: 1, validUntil: 1 });
TaskSubmissionSchema.index({ taskId: 1, userId: 1 });
TaskSubmissionSchema.index({ status: 1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export const TaskSubmission = mongoose.models.TaskSubmission || mongoose.model<ITaskSubmission>('TaskSubmission', TaskSubmissionSchema);
