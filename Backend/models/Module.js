import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  number: {
    type: Number,
    required: [true, 'Module number is required'],
    min: [1, 'Module number must be at least 1']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate lectures
moduleSchema.virtual('lectures', {
  ref: 'Lecture',
  localField: '_id',
  foreignField: 'moduleId'
});

// Ensure unique module numbers within a course
moduleSchema.index({ courseId: 1, number: 1 }, { unique: true });

// Index for better performance
moduleSchema.index({ courseId: 1 });

export default mongoose.model('Module', moduleSchema);