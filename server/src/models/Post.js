const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [10, 'Content must be at least 10 characters long'],
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  featuredImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
  },
  // Admin approval fields
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    default: null
  },
  submittedForApproval: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reading time (assuming 200 words per minute)
postSchema.virtual('readingTime').get(function() {
  const wordCount = this.content.split(' ').length;
  return Math.ceil(wordCount / 200);
});

// Virtual for formatted date
postSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Index for better query performance
postSchema.index({ title: 'text', content: 'text' });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ status: 1, isPublished: 1 });
postSchema.index({ slug: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ isApproved: 1, status: 1 });
postSchema.index({ submittedForApproval: 1, submittedAt: -1 });

// Pre-save middleware to generate excerpt if not provided
postSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 150) + '...';
  }
  
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
    this.isPublished = true;
  }
  
  // Set approval status when status changes
  if (this.status === 'pending' && !this.submittedForApproval) {
    this.submittedForApproval = true;
    this.submittedAt = new Date();
  }
  
  if (this.status === 'published' && !this.isApproved) {
    this.isApproved = true;
  }
  
  next();
});

// Instance method to increment view count
postSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment like count
postSchema.methods.incrementLikeCount = function() {
  this.likeCount += 1;
  return this.save();
};

// Instance method to decrement like count
postSchema.methods.decrementLikeCount = function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
  }
  return this.save();
};

// Instance method to increment comment count
postSchema.methods.incrementCommentCount = function() {
  this.commentCount += 1;
  return this.save();
};

// Instance method to decrement comment count
postSchema.methods.decrementCommentCount = function() {
  if (this.commentCount > 0) {
    this.commentCount -= 1;
  }
  return this.save();
};

// Instance method to submit for approval
postSchema.methods.submitForApproval = function() {
  this.status = 'pending';
  this.submittedForApproval = true;
  this.submittedAt = new Date();
  return this.save();
};

// Instance method to approve post
postSchema.methods.approve = function(adminId) {
  this.status = 'published';
  this.isApproved = true;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.publishedAt = new Date();
  this.isPublished = true;
  this.rejectionReason = null;
  return this.save();
};

// Instance method to reject post
postSchema.methods.reject = function(adminId, reason) {
  this.status = 'rejected';
  this.isApproved = false;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Static method to find published posts
postSchema.statics.findPublished = function() {
  return this.find({ 
    status: 'published', 
    isPublished: true,
    isApproved: true,
    publishedAt: { $lte: new Date() }
  });
};

// Static method to find pending posts for approval
postSchema.statics.findPendingApproval = function() {
  return this.find({ 
    status: 'pending',
    submittedForApproval: true
  });
};

// Static method to find by slug
postSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase() });
};

// Static method to search posts
postSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    status: 'published',
    isPublished: true,
    isApproved: true
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Post', postSchema); 