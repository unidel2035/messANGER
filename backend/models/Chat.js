const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() {
      return this.isGroup;
    }
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
