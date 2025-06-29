// models/LiveChat.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'admin';
  message: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }[];
}

export interface ILiveChat extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  status: 'Waiting' | 'Active' | 'Ended';
  messages: IChatMessage[];
  startedAt: Date;
  endedAt?: Date;
  rating?: number;
  feedback?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    deviceInfo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
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
    }
  }]
}, {
  _id: false
});

const LiveChatSchema = new Schema<ILiveChat>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['Waiting', 'Active', 'Ended'],
    default: 'Waiting',
    index: true
  },
  messages: [ChatMessageSchema],
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date,
    default: null
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null
  },
  metadata: {
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    source: {
      type: String,
      default: 'web'
    },
    deviceInfo: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true,
  collection: 'live_chats'
});

// Indexes for better performance
LiveChatSchema.index({ userId: 1, status: 1 });
LiveChatSchema.index({ adminId: 1, status: 1 });
LiveChatSchema.index({ startedAt: -1 });
LiveChatSchema.index({ status: 1, startedAt: -1 });

// Virtual for chat duration
LiveChatSchema.virtual('duration').get(function() {
  if (this.endedAt) {
    return this.endedAt.getTime() - this.startedAt.getTime();
  }
  return Date.now() - this.startedAt.getTime();
});

// Virtual for unread message count
LiveChatSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => !msg.isRead).length;
});

// Virtual for last message
LiveChatSchema.virtual('lastMessage').get(function() {
  if (this.messages && this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
});

// Instance methods
LiveChatSchema.methods.addMessage = function(messageData: Partial<IChatMessage>) {
  const message: IChatMessage = {
    id: new mongoose.Types.ObjectId().toString(),
    senderId: messageData.senderId!,
    senderType: messageData.senderType!,
    message: messageData.message!,
    timestamp: new Date(),
    isRead: false,
    attachments: messageData.attachments || []
  };
  
  this.messages.push(message);
  return this.save();
};

LiveChatSchema.methods.markMessagesAsRead = function(senderType?: 'user' | 'admin') {
  this.messages.forEach((msg: IChatMessage) => {
    if (!senderType || msg.senderType !== senderType) {
      msg.isRead = true;
    }
  });
  return this.save();
};

LiveChatSchema.methods.endChat = function(rating?: number, feedback?: string) {
  this.status = 'Ended';
  this.endedAt = new Date();
  if (rating) this.rating = rating;
  if (feedback) this.feedback = feedback;
  return this.save();
};

// Static methods
LiveChatSchema.statics.getActiveChatsForAdmin = function(adminId: string) {
  return this.find({
    adminId: new mongoose.Types.ObjectId(adminId),
    status: 'Active'
  }).populate('userId', 'name email profilePicture');
};

LiveChatSchema.statics.getWaitingChats = function() {
  return this.find({ status: 'Waiting' })
    .populate('userId', 'name email profilePicture')
    .sort({ startedAt: 1 });
};

LiveChatSchema.statics.getUserActiveChat = function(userId: string) {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['Waiting', 'Active'] }
  });
};

// Pre-save middleware
LiveChatSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'Ended' && !this.endedAt) {
    this.endedAt = new Date();
  }
  next();
});

// Ensure virtuals are included when converting to JSON
LiveChatSchema.set('toJSON', { virtuals: true });
LiveChatSchema.set('toObject', { virtuals: true });

export const LiveChat = mongoose.models.LiveChat || mongoose.model<ILiveChat>('LiveChat', LiveChatSchema);
export const ChatMessage = ChatMessageSchema;