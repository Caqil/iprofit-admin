import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'bonus' | 'profit' | 'penalty';
  amount: number;
  currency: 'USD' | 'BDT';
  gateway: 'CoinGate' | 'UddoktaPay' | 'Manual' | 'System';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Failed';
  description?: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  approvedBy?: string;
  rejectionReason?: string;
  fees: number;
  netAmount: number;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'bonus', 'profit', 'penalty'],
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
    required: true
  },
  gateway: {
    type: String,
    enum: ['CoinGate', 'UddoktaPay', 'Manual', 'System'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Processing', 'Failed'],
    default: 'Pending'
  },
  description: {
    type: String,
    default: null
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayTransactionId: {
    type: String,
    default: null
  },
  gatewayResponse: {
    type: Schema.Types.Mixed,
    default: null
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ transactionId: 1 });
TransactionSchema.index({ gateway: 1 });

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
