# messANGER

A modern, full-stack real-time messenger application with voice and video calling capabilities.

## Features

- **Real-time Messaging**: Instant messaging powered by Socket.IO
- **Voice & Video Calls**: P2P calls using WebRTC technology
- **Private & Group Chats**: Create one-on-one or group conversations
- **User Authentication**: Secure JWT-based authentication
- **Modern UI**: Beautiful, responsive interface built with Vue.js and Element Plus
- **Online Status**: Real-time user presence tracking
- **Typing Indicators**: See when others are typing
- **Chat Management**: Rename groups, add/remove participants
- **Message History**: Persistent message storage with MongoDB

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - Database for storing users, chats, and messages
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Element Plus** - UI component library
- **Axios** - HTTP client
- **Socket.IO Client** - WebSocket client
- **Vite** - Build tool and dev server

## Project Structure

```
messANGER/
├── backend/
│   ├── models/           # Database models
│   │   ├── User.js
│   │   ├── Chat.js
│   │   └── Message.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── chats.js
│   │   └── users.js
│   ├── middleware/       # Express middleware
│   │   └── auth.js
│   ├── socketHandlers.js # Socket.IO event handlers
│   ├── server.js         # Application entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/          # API configuration
    │   │   ├── axios.js
    │   │   └── socket.js
    │   ├── components/   # Vue components
    │   │   ├── ChatList.vue
    │   │   ├── ChatRoom.vue
    │   │   └── IncomingCallDialog.vue
    │   ├── views/        # Page components
    │   │   ├── Login.vue
    │   │   ├── Register.vue
    │   │   └── Messenger.vue
    │   ├── stores/       # Pinia stores
    │   │   ├── auth.js
    │   │   ├── chat.js
    │   │   └── call.js
    │   ├── router/       # Vue Router config
    │   │   └── index.js
    │   ├── App.vue
    │   └── main.js
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/messenger
JWT_SECRET=your_secure_secret_key_here
NODE_ENV=development
```

5. Ensure MongoDB is running on your system

6. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend server will start on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a `.env` file if you need to customize the API URL:
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

5. Build for production:
```bash
npm run build
```

## Usage

### Creating an Account

1. Open the application at `http://localhost:5173`
2. Click "Sign Up" to create a new account
3. Enter your username, email, and password
4. Click "Sign Up" to register

### Starting a Chat

1. After logging in, click the "+" button in the sidebar
2. Search for users by username or email
3. Select a user and choose "Private Chat" or "Group Chat"
4. For group chats, enter a group name and select multiple users
5. Click "Create Chat"

### Sending Messages

1. Select a chat from the sidebar
2. Type your message in the input field at the bottom
3. Press Enter or click "Send"

### Making Calls

1. Open a private chat
2. Click the phone icon for a voice call
3. Click the video camera icon for a video call
4. The other user will receive a call notification
5. During a call, you can:
   - Toggle microphone on/off
   - Toggle camera on/off (video calls only)
   - End the call

### Managing Group Chats

1. Open a group chat
2. Click the three-dot menu
3. Options available:
   - Rename Group
   - Add Participants (admin only)
   - Remove Participants (admin only)
   - Delete Group (admin only)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/search?query=` - Search users
- `GET /api/users/:userId` - Get user by ID
- `PATCH /api/users/me` - Update current user profile

### Chats
- `GET /api/chats` - Get all chats for current user
- `POST /api/chats` - Create a new chat
- `GET /api/chats/:chatId` - Get chat by ID
- `PATCH /api/chats/:chatId` - Update chat (rename, avatar)
- `DELETE /api/chats/:chatId` - Delete chat
- `GET /api/chats/:chatId/messages` - Get messages for a chat
- `POST /api/chats/:chatId/messages` - Send a message
- `POST /api/chats/:chatId/participants` - Add participants to group
- `DELETE /api/chats/:chatId/participants/:participantId` - Remove participant

## WebSocket Events

### Client → Server
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `message:send` - Send a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark message as read
- `call:initiate` - Start a call
- `call:answer` - Answer a call
- `call:reject` - Reject a call
- `call:end` - End a call
- `call:ice-candidate` - Exchange ICE candidates

### Server → Client
- `message:new` - New message received
- `typing:user` - User typing status
- `user:status` - User online/offline status
- `call:incoming` - Incoming call
- `call:answered` - Call answered
- `call:rejected` - Call rejected
- `call:ended` - Call ended
- `call:ice-candidate` - ICE candidate from peer

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Protected API routes with authentication middleware
- Socket.IO authentication
- Input validation
- CORS configuration

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Code Structure Guidelines

- **Models**: Define MongoDB schemas and methods
- **Routes**: Handle HTTP requests and responses
- **Middleware**: Reusable request processing logic
- **Socket Handlers**: Manage WebSocket connections and events
- **Stores**: Pinia stores for state management
- **Components**: Reusable Vue components
- **Views**: Page-level components

## Troubleshooting

### Cannot connect to MongoDB
- Ensure MongoDB is running: `systemctl status mongodb` or `brew services list`
- Check MongoDB URI in `.env` file
- Verify MongoDB is listening on the correct port

### Socket.IO connection failed
- Check that backend server is running
- Verify CORS settings allow frontend URL
- Check browser console for error messages

### WebRTC calls not working
- Ensure HTTPS is used in production (or localhost for development)
- Check browser permissions for camera/microphone
- Verify STUN/TURN servers are accessible
- Check firewall settings

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`
- Check Node.js version: `node --version`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

WebRTC features require modern browsers with full WebRTC support.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Future Enhancements

- File sharing and media attachments
- Message reactions and emoji support
- Message search functionality
- User profiles with avatars
- Push notifications
- End-to-end encryption
- Group video calls
- Screen sharing
- Message editing and deletion
- Read receipts
- Custom themes
- Mobile app (React Native)

---

Built with by the messANGER team
