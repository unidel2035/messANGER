const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Chat = require('./models/Chat');

// Store active connections
const activeUsers = new Map(); // userId -> socketId
const activeCalls = new Map(); // callId -> { caller, callee, offer, answer }

module.exports = (io) => {
  // Authentication middleware for socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Store active user
    activeUsers.set(socket.userId, socket.id);

    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, {
      status: 'online',
      lastSeen: new Date()
    });

    // Notify others about user's online status
    socket.broadcast.emit('user:status', {
      userId: socket.userId,
      status: 'online'
    });

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join all chat rooms the user is part of
    const userChats = await Chat.find({ participants: socket.userId });
    userChats.forEach(chat => {
      socket.join(`chat:${chat._id}`);
    });

    // Handle joining a chat room
    socket.on('chat:join', async (chatId) => {
      try {
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.userId
        });

        if (chat) {
          socket.join(`chat:${chatId}`);
          socket.emit('chat:joined', { chatId });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle leaving a chat room
    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // Handle sending a message
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text' } = data;

        // Verify user is participant
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.userId
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Create message
        const message = new Message({
          chat: chatId,
          sender: socket.userId,
          content,
          type,
          readBy: [socket.userId]
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Update chat's last message
        chat.lastMessage = message._id;
        await chat.save();

        // Emit message to all participants in the chat
        io.to(`chat:${chatId}`).emit('message:new', {
          message,
          chatId
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicator
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:user', {
        chatId,
        userId: socket.userId,
        username: socket.username,
        isTyping: true
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:user', {
        chatId,
        userId: socket.userId,
        username: socket.username,
        isTyping: false
      });
    });

    // Handle message read receipts
    socket.on('message:read', async ({ messageId, chatId }) => {
      try {
        const message = await Message.findById(messageId);

        if (message && !message.readBy.includes(socket.userId)) {
          message.readBy.push(socket.userId);
          await message.save();

          io.to(`chat:${chatId}`).emit('message:read', {
            messageId,
            chatId,
            userId: socket.userId
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // WebRTC signaling for voice/video calls
    socket.on('call:initiate', async ({ calleeId, offer, isVideo }) => {
      try {
        const callId = `${socket.userId}-${calleeId}-${Date.now()}`;
        const calleeSocketId = activeUsers.get(calleeId);

        if (!calleeSocketId) {
          return socket.emit('call:error', { message: 'User is offline' });
        }

        activeCalls.set(callId, {
          callId,
          caller: socket.userId,
          callee: calleeId,
          offer,
          isVideo
        });

        // Send call invitation to callee
        io.to(calleeSocketId).emit('call:incoming', {
          callId,
          caller: {
            id: socket.userId,
            username: socket.username
          },
          offer,
          isVideo
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('call:answer', async ({ callId, answer }) => {
      try {
        const call = activeCalls.get(callId);

        if (!call) {
          return socket.emit('call:error', { message: 'Call not found' });
        }

        call.answer = answer;

        const callerSocketId = activeUsers.get(call.caller);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call:answered', {
            callId,
            answer
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('call:ice-candidate', ({ callId, candidate, to }) => {
      const targetSocketId = activeUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ice-candidate', {
          callId,
          candidate,
          from: socket.userId
        });
      }
    });

    socket.on('call:reject', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (call) {
        const callerSocketId = activeUsers.get(call.caller);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call:rejected', { callId });
        }
        activeCalls.delete(callId);
      }
    });

    socket.on('call:end', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (call) {
        // Notify both parties
        const callerSocketId = activeUsers.get(call.caller);
        const calleeSocketId = activeUsers.get(call.callee);

        if (callerSocketId) {
          io.to(callerSocketId).emit('call:ended', { callId });
        }
        if (calleeSocketId) {
          io.to(calleeSocketId).emit('call:ended', { callId });
        }

        activeCalls.delete(callId);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.userId})`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date()
      });

      // Notify others about user's offline status
      socket.broadcast.emit('user:status', {
        userId: socket.userId,
        status: 'offline'
      });

      // End any active calls
      activeCalls.forEach((call, callId) => {
        if (call.caller === socket.userId || call.callee === socket.userId) {
          const otherUserId = call.caller === socket.userId ? call.callee : call.caller;
          const otherSocketId = activeUsers.get(otherUserId);

          if (otherSocketId) {
            io.to(otherSocketId).emit('call:ended', { callId });
          }

          activeCalls.delete(callId);
        }
      });
    });
  });
};
