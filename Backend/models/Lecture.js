import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lecture title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  order: {
    type: Number,
    required: [true, 'Lecture order is required'],
    min: [1, 'Order must be at least 1']
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'Module ID is required']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true
  },

}, {
  timestamps: true
});

// Ensure unique lecture orders within a module
lectureSchema.index({ moduleId: 1, order: 1 }, { unique: true });

// Index for better performance
lectureSchema.index({ moduleId: 1 });

// Virtual to get module and course details
lectureSchema.virtual('module', {
  ref: 'Module',
  localField: 'moduleId',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model('Lecture', lectureSchema);