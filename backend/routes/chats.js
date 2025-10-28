const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all chats for current user
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.userId
    })
      .populate('participants', 'username avatar status')
      .populate('lastMessage')
      .populate('admin', 'username')
      .sort({ updatedAt: -1 });

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new chat (private or group)
router.post('/', async (req, res) => {
  try {
    const { participantIds, isGroup, name } = req.body;

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participants required' });
    }

    // Add current user to participants
    const allParticipants = [...new Set([req.userId.toString(), ...participantIds])];

    // For private chats, check if chat already exists
    if (!isGroup && allParticipants.length === 2) {
      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: { $all: allParticipants, $size: 2 }
      });

      if (existingChat) {
        return res.json({ chat: existingChat });
      }
    }

    // Create new chat
    const chat = new Chat({
      participants: allParticipants,
      isGroup: isGroup || false,
      name: isGroup ? name : undefined,
      admin: isGroup ? req.userId : undefined
    });

    await chat.save();
    await chat.populate('participants', 'username avatar status');

    res.status(201).json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat by ID
router.get('/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    })
      .populate('participants', 'username avatar status')
      .populate('admin', 'username');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update chat (rename, change avatar)
router.patch('/:chatId', async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Only group admin can update group chat
    if (chat.isGroup && chat.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can update group chat' });
    }

    if (name !== undefined) chat.name = name;
    if (avatar !== undefined) chat.avatar = avatar;

    await chat.save();
    await chat.populate('participants', 'username avatar status');

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Only group admin can delete group chat
    if (chat.isGroup && chat.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can delete group chat' });
    }

    await Chat.deleteOne({ _id: req.params.chatId });
    await Message.deleteMany({ chat: req.params.chatId });

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const query = { chat: req.params.chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create message
    const message = new Message({
      chat: req.params.chatId,
      sender: req.userId,
      content,
      type,
      readBy: [req.userId]
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    // Update chat's last message
    chat.lastMessage = message._id;
    await chat.save();

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add participants to group chat
router.post('/:chatId/participants', async (req, res) => {
  try {
    const { participantIds } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot add participants to private chat' });
    }

    // Only admin can add participants
    if (chat.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can add participants' });
    }

    // Add new participants
    const newParticipants = participantIds.filter(
      id => !chat.participants.includes(id)
    );
    chat.participants.push(...newParticipants);

    await chat.save();
    await chat.populate('participants', 'username avatar status');

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove participant from group chat
router.delete('/:chatId/participants/:participantId', async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ error: 'Cannot remove participants from private chat' });
    }

    // Only admin can remove participants (or user can remove themselves)
    const isAdmin = chat.admin.toString() === req.userId.toString();
    const isSelf = req.params.participantId === req.userId.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Only admin can remove participants' });
    }

    chat.participants = chat.participants.filter(
      id => id.toString() !== req.params.participantId
    );

    await chat.save();
    await chat.populate('participants', 'username avatar status');

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
