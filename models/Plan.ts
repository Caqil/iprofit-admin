import mongoose, { Document, Schema } from 'mongoose';

export interface IPlan extends Document {
  _id: string;
  name: string;
  description: string;
  depositLimit: number;
  withdrawalLimit: number;
  profitLimit: number;
  minimumDeposit: number;
  minimumWithdrawal: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  features: string[];
  color: string;
  icon?: string;
  price: number;
  currency: 'USD' | 'BDT';
  duration?: number; // in days
  isActive: boolean;
  priority: number;
  metadata?: {
    benefits?: string[];
    restrictions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>({
  name: {
    type: String,
    required: true,
    unique: true, // This creates an index automatically
    trim: true
    // Remove the separate index: true to fix duplicate index warning
  },
  description: {
    type: String,
    required: true
  },
  depositLimit: {
    type: Number,
    required: true,
    min: 0
  },
  withdrawalLimit: {
    type: Number,
    required: true,
    min: 0
  },
  profitLimit: {
    type: Number,
    required: true,
    min: 0
  },
  minimumDeposit: {
    type: Number,
    required: true,
    min: 0
  },
  minimumWithdrawal: {
    type: Number,
    required: true,
    min: 0
  },
  dailyWithdrawalLimit: {
    type: Number,
    required: true,
    min: 0
  },
  monthlyWithdrawalLimit: {
    type: Number,
    required: true,
    min: 0
  },
  features: [{
    type: String
  }],
  color: {
    type: String,
    default: '#000000'
  },
  icon: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'BDT'],
    default: 'BDT'
  },
  duration: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  },
  metadata: {
    benefits: [String],
    restrictions: [String]
  }
}, {
  timestamps: true,
  collection: 'plans'
});

// Create indexes manually to avoid duplicates
// name already has an index from unique: true, so don't create another one
PlanSchema.index({ isActive: 1 });
PlanSchema.index({ priority: -1 });
PlanSchema.index({ createdAt: -1 });

export const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);
