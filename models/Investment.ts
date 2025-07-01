// models/Investment.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IInvestment extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  amount: number;
  currency: 'USD' | 'BDT';
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled' | 'Matured';
  type: 'plan_subscription' | 'additional_investment' | 'reinvestment' | 'upgrade';
  
  // Investment details
  startDate: Date;
  maturityDate?: Date;
  actualMaturityDate?: Date;
  duration: number; // in days
  
  // Profit tracking
  expectedDailyProfit: number;
  expectedMonthlyProfit: number;
  expectedTotalProfit: number;
  actualTotalProfit: number;
  lastProfitDate?: Date;
  nextProfitDate?: Date;
  profitFrequency: 'daily' | 'weekly' | 'monthly'; // How often profits are credited
  
  // Performance metrics
  profitRate: number; // Daily/Monthly percentage
  totalProfitPaid: number;
  remainingProfitPotential: number;
  roi: number; // Return on Investment percentage
  
  // Investment lifecycle
  autoReinvest: boolean;
  reinvestmentPercentage: number;
  compoundingEnabled: boolean;
  
  // Transaction references
  initialTransactionId?: mongoose.Types.ObjectId;
  profitTransactionIds: mongoose.Types.ObjectId[];
  withdrawalTransactionIds: mongoose.Types.ObjectId[];
  
  // Risk and performance
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  performanceScore: number; // 0-100
  volatilityIndex: number;
  
  // Metadata
  metadata?: {
    investmentSource?: string; // 'plan_upgrade', 'direct_investment', 'referral_bonus'
    promotionalOffer?: string;
    bonusPercentage?: number;
    deviceId?: string;
    ipAddress?: string;
    referredBy?: mongoose.Types.ObjectId;
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  isMatured?: boolean;
  daysActive?: number;
  profitToDate?: number;
  expectedVsActualProfit?: number;
}

const InvestmentSchema = new Schema<IInvestment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'BDT'],
    default: 'BDT'
  },
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Completed', 'Cancelled', 'Matured'],
    default: 'Active'
  },
  type: {
    type: String,
    enum: ['plan_subscription', 'additional_investment', 'reinvestment', 'upgrade'],
    default: 'plan_subscription'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  maturityDate: {
    type: Date,
    default: null
  },
  actualMaturityDate: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  expectedDailyProfit: {
    type: Number,
    required: true,
    min: 0
  },
  expectedMonthlyProfit: {
    type: Number,
    required: true,
    min: 0
  },
  expectedTotalProfit: {
    type: Number,
    required: true,
    min: 0
  },
  actualTotalProfit: {
    type: Number,
    default: 0,
    min: 0
  },
  lastProfitDate: {
    type: Date,
    default: null
  },
  nextProfitDate: {
    type: Date,
    default: null
  },
  profitFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  profitRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalProfitPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingProfitPotential: {
    type: Number,
    default: 0,
    min: 0
  },
  roi: {
    type: Number,
    default: 0
  },
  autoReinvest: {
    type: Boolean,
    default: false
  },
  reinvestmentPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  compoundingEnabled: {
    type: Boolean,
    default: false
  },
  initialTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  profitTransactionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  withdrawalTransactionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Very High'],
    default: 'Medium'
  },
  performanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  volatilityIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metadata: {
    investmentSource: String,
    promotionalOffer: String,
    bonusPercentage: Number,
    deviceId: String,
    ipAddress: String,
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  collection: 'investments',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
InvestmentSchema.virtual('isMatured').get(function() {
  if (!this.maturityDate) return false;
  return new Date() >= this.maturityDate;
});

InvestmentSchema.virtual('daysActive').get(function() {
  const now = new Date();
  const start = this.startDate;
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
});

InvestmentSchema.virtual('profitToDate').get(function() {
  return this.totalProfitPaid;
});

InvestmentSchema.virtual('expectedVsActualProfit').get(function() {
  if (this.expectedTotalProfit === 0) return 0;
  return ((this.actualTotalProfit - this.expectedTotalProfit) / this.expectedTotalProfit) * 100;
});

// Indexes for performance
InvestmentSchema.index({ userId: 1 });
InvestmentSchema.index({ planId: 1 });
InvestmentSchema.index({ status: 1 });
InvestmentSchema.index({ startDate: -1 });
InvestmentSchema.index({ maturityDate: 1 });
InvestmentSchema.index({ nextProfitDate: 1 });
InvestmentSchema.index({ userId: 1, status: 1 });
InvestmentSchema.index({ planId: 1, status: 1 });
InvestmentSchema.index({ createdAt: -1 });
InvestmentSchema.index({ amount: -1 });
InvestmentSchema.index({ roi: -1 });

// Pre-save middleware to calculate fields
InvestmentSchema.pre('save', function(next) {
  // Calculate maturity date if not set
  if (!this.maturityDate && this.duration) {
    this.maturityDate = new Date(this.startDate.getTime() + (this.duration * 24 * 60 * 60 * 1000));
  }
  
  // Calculate ROI
  if (this.amount > 0) {
    this.roi = (this.actualTotalProfit / this.amount) * 100;
  }
  
  // Calculate remaining profit potential
  this.remainingProfitPotential = Math.max(0, this.expectedTotalProfit - this.totalProfitPaid);
  
  // Set next profit date if not set
  if (!this.nextProfitDate && this.status === 'Active') {
    const nextDate = new Date();
    switch (this.profitFrequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    this.nextProfitDate = nextDate;
  }
  
  next();
});

export const Investment = mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);