import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  _id: string;
  referrerId: mongoose.Types.ObjectId;
  refereeId: mongoose.Types.ObjectId;
  bonusAmount: number;
  profitBonus: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
  bonusType: 'signup' | 'profit_share';
  transactionId?: mongoose.Types.ObjectId;
  metadata?: {
    refereeFirstDeposit?: number;
    refereeFirstDepositDate?: Date;
    totalRefereeProfit?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

const ReferralSchema = new Schema<IReferral>({
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refereeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bonusAmount: {
    type: Number,
    required: true,
    min: 0
  },
  profitBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  bonusType: {
    type: String,
    enum: ['signup', 'profit_share'],
    required: true
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  metadata: {
    refereeFirstDeposit: Number,
    refereeFirstDepositDate: Date,
    totalRefereeProfit: Number
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'referrals'
});

ReferralSchema.index({ referrerId: 1 });
ReferralSchema.index({ refereeId: 1 });
ReferralSchema.index({ status: 1 });
ReferralSchema.index({ bonusType: 1 });
ReferralSchema.index({ createdAt: -1 });

export const Referral = mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);
