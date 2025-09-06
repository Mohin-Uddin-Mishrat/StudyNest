import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100']
  },
  completed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture'
  }],
  unlocked: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture'
  }]
}, {
  timestamps: true
});

// Ensure one enrollment per user per course
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Index for better performance
enrollmentSchema.index({ userId: 1 });
enrollmentSchema.index({ courseId: 1 });

// Virtual to populate user details
enrollmentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate course details
enrollmentSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true
});

// Method to calculate progress based on completed lectures
enrollmentSchema.methods.calculateProgress = async function() {
  const Course = mongoose.model('Course');
  const Module = mongoose.model('Module');
  const Lecture = mongoose.model('Lecture');
  
  // Get all modules for this course
  const modules = await Module.find({ courseId: this.courseId });
  const moduleIds = modules.map(module => module._id);
  
  // Get total lectures count
  const totalLectures = await Lecture.countDocuments({ moduleId: { $in: moduleIds } });
  
  if (totalLectures === 0) return 0;
  
  // Calculate progress percentage
  const completedCount = this.completed.length;
  this.progress = Math.round((completedCount / totalLectures) * 100);
  
  return this.progress;
};

// Method to unlock next lecture
enrollmentSchema.methods.unlockNextLecture = async function(currentLectureId) {
  const Lecture = mongoose.model('Lecture');
  const Module = mongoose.model('Module');
  
  const currentLecture = await Lecture.findById(currentLectureId).populate('moduleId');
  if (!currentLecture) return;
  
  // Find next lecture in the same module
  let nextLecture = await Lecture.findOne({
    moduleId: currentLecture.moduleId,
    order: currentLecture.order + 1
  });
  
  // If no next lecture in current module, find first lecture of next module
  if (!nextLecture) {
    const nextModule = await Module.findOne({
      courseId: currentLecture.moduleId.courseId,
      number: currentLecture.moduleId.number + 1
    });
    
    if (nextModule) {
      nextLecture = await Lecture.findOne({
        moduleId: nextModule._id,
        order: 1
      });
    }
  }
  
  // Unlock the next lecture if found and not already unlocked
  if (nextLecture && !this.unlocked.includes(nextLecture._id)) {
    this.unlocked.push(nextLecture._id);
    await this.save();
  }
  
  return nextLecture;
};

export default mongoose.model('Enrollment', enrollmentSchema);