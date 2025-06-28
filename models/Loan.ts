import mongoose, { Document, Schema } from 'mongoose';

export interface ILoan extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: 'USD' | 'BDT';
  interestRate: number;
  tenure: number; // in months
  emiAmount: number;
  creditScore: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Completed' | 'Defaulted';
  purpose: string;
  monthlyIncome: number;
  employmentStatus: string;
  collateral?: {
    type: string;
    value: number;
    description: string;
  };
  documents: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  repaymentSchedule: {
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    principal: number;
    interest: number;
    status: 'Pending' | 'Paid' | 'Overdue';
    paidAt?: Date;
    paidAmount?: number;
  }[];
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  disbursedAt?: Date;
  completedAt?: Date;
  totalPaid: number;
  remainingAmount: number;
  overdueAmount: number;
  penaltyAmount: number;
  metadata?: {
    applicationSource?: string;
    riskAssessment?: any;
    creditHistory?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  tenure: {
    type: Number,
    required: true,
    min: 1
  },
  emiAmount: {
    type: Number,
    required: true,
    min: 0
  },
  creditScore: {
    type: Number,
    required: true,
    min: 300,
    max: 850
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted'],
    default: 'Pending'
  },
  purpose: {
    type: String,
    required: true
  },
  monthlyIncome: {
    type: Number,
    required: true,
    min: 0
  },
  employmentStatus: {
    type: String,
    required: true
  },
  collateral: {
    type: {
      type: String
    },
    value: Number,
    description: String
  },
  documents: [{
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  repaymentSchedule: [{
    installmentNumber: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    principal: {
      type: Number,
      required: true
    },
    interest: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue'],
      default: 'Pending'
    },
    paidAt: Date,
    paidAmount: Number
  }],
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  disbursedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  overdueAmount: {
    type: Number,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },
  metadata: {
    applicationSource: String,
    riskAssessment: Schema.Types.Mixed,
    creditHistory: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'loans'
});

// Create indexes manually to avoid duplicates
LoanSchema.index({ userId: 1 });
LoanSchema.index({ status: 1 });
LoanSchema.index({ creditScore: 1 });
LoanSchema.index({ createdAt: -1 });
LoanSchema.index({ 'repaymentSchedule.dueDate': 1 });
LoanSchema.index({ amount: 1 });
LoanSchema.index({ approvedBy: 1 });

export const Loan = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);
