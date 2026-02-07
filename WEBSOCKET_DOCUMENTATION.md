# WebSocket Gateway Documentation

## Overview

The WebSocket gateway enables real-time, bidirectional communication between the server and clients. Each user has their own socket connection identified by their MongoDB `_id`, allowing for private messaging without broadcasting.

## Connection URL

```
ws://localhost:3000
```

In production:
```
wss://your-domain.com
```

## Authentication

WebSocket connections require JWT authentication. The access token must be provided during the connection handshake.

### Client Connection Examples

#### JavaScript (Socket.IO Client)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

// Or using headers
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-access-token'
  }
});
```

#### React Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    const newSocket = io('http://localhost:3000', {
      auth: { token: accessToken }
    });

    newSocket.on('connected', (data) => {
      console.log('Connected:', data);
    });

    newSocket.on('error', (error) => {
      console.error('Connection error:', error);
    });

    newSocket.on('notification', (data) => {
      console.log('Received notification:', data);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const sendMessage = () => {
    if (socket) {
      socket.emit('message', { message: 'Hello from client!' });
    }
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

## Client Events

### Events the Client Can Emit

#### 1. `message` - Send a message to the server

```javascript
socket.emit('message', {
  message: 'Your message here',
  // Add any additional data
  data: { /* custom data */ }
});
```

**Response:** Server will emit `messageReceived` event back to the sender

### Events the Client Can Listen To

#### 1. `connected` - Connection successful

Emitted when the client successfully connects and authenticates.

```javascript
socket.on('connected', (data) => {
  console.log(data);
  // {
  //   message: 'Successfully connected to WebSocket',
  //   userId: '507f1f77bcf86cd799439011',
  //   socketId: 'abc123xyz'
  // }
});
```

#### 2. `error` - Authentication or connection error

```javascript
socket.on('error', (error) => {
  console.error(error);
  // { message: 'Authentication failed' }
});
```

#### 3. `messageReceived` - Acknowledgment from server

Emitted when the server receives a message from the client.

```javascript
socket.on('messageReceived', (data) => {
  console.log(data);
  // {
  //   success: true,
  //   message: 'Message received by server',
  //   data: {
  //     receivedMessage: 'Your message',
  //     timestamp: '2026-02-07T10:00:00.000Z'
  //   }
  // }
});
```

#### 4. Custom Events

The server can emit any custom event to specific users. Listen for custom events:

```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
});

socket.on('alert', (data) => {
  console.log('Alert:', data);
});

socket.on('update', (data) => {
  console.log('Update:', data);
});
```

## REST API Endpoints for Sending Messages

These endpoints allow the backend to send WebSocket messages to specific users.

### 1. Send Message to a User

**POST** `/api/gateway/send`

Send a WebSocket message to a specific user by their MongoDB `_id`.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "event": "notification",
  "message": {
    "title": "New Message",
    "body": "You have a new message",
    "timestamp": "2026-02-07T10:00:00.000Z"
  }
}
```

**Response (User Connected):**
```json
{
  "success": true,
  "message": "Message sent to user 507f1f77bcf86cd799439011"
}
```

**Response (User Not Connected):**
```json
{
  "success": false,
  "message": "User 507f1f77bcf86cd799439011 is not connected"
}
```

### 2. Send Message to Multiple Users

**POST** `/api/gateway/send-many`

Send a WebSocket message to multiple users at once.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "userIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "event": "announcement",
  "message": {
    "title": "System Announcement",
    "body": "Scheduled maintenance tonight"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent to 3 users",
  "userIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

### 3. Check User Connection Status

**GET** `/api/gateway/status/:userId`

Check if a specific user is currently connected.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "connected": true
}
```

### 4. Get All Connected Users

**GET** `/api/gateway/connected`

Get a list of all currently connected users.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "connectedUsers": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "count": 2
}
```

### 5. Get Connection Statistics

**GET** `/api/gateway/stats`

Get WebSocket connection statistics.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "connectedUsers": 2,
  "userIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ]
}
```

## Usage Examples

### Backend: Send Message to User from Service

You can inject the `AppGateway` into any service to send messages:

```typescript
import { Injectable } from '@nestjs/common';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class NotificationService {
  constructor(private readonly appGateway: AppGateway) {}

  async sendNotification(userId: string, notification: any) {
    // Check if user is connected
    if (this.appGateway.isUserConnected(userId)) {
      // Send notification via WebSocket
      this.appGateway.sendMessageToUser(userId, 'notification', {
        title: notification.title,
        body: notification.body,
        timestamp: new Date().toISOString(),
      });
    } else {
      // User is offline, save notification to database for later
      console.log(`User ${userId} is offline, notification saved`);
    }
  }
}
```

### Frontend: Complete Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    const newSocket = io('http://localhost:3000', {
      auth: { token: accessToken }
    });

    // Connection successful
    newSocket.on('connected', (data) => {
      console.log('Connected:', data);
      setConnected(true);
    });

    // Connection error
    newSocket.on('error', (error) => {
      console.error('Error:', error);
      setConnected(false);
    });

    // Message received acknowledgment
    newSocket.on('messageReceived', (data) => {
      console.log('Server received:', data);
    });

    // Listen for notifications
    newSocket.on('notification', (data) => {
      setMessages(prev => [...prev, {
        type: 'notification',
        ...data
      }]);
    });

    // Listen for custom events
    newSocket.on('alert', (data) => {
      alert(data.message);
    });

    // Disconnection
    newSocket.on('disconnect', () => {
      console.log('Disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const sendMessage = () => {
    if (socket && inputMessage.trim()) {
      socket.emit('message', {
        message: inputMessage,
        timestamp: new Date().toISOString()
      });
      setInputMessage('');
    }
  };

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>

      <div>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.title}:</strong> {msg.body}
          </div>
        ))}
      </div>

      <input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

## Testing with Postman/Thunder Client

### 1. Test WebSocket Connection

1. Create a WebSocket request
2. URL: `ws://localhost:3000`
3. Add connection parameters:
   ```json
   {
     "auth": {
       "token": "your-jwt-access-token"
     }
   }
   ```
4. Connect and listen for `connected` event

### 2. Send Message via API

```bash
# Send message to a specific user
curl -X POST http://localhost:3000/api/gateway/send \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "event": "notification",
    "message": {
      "title": "Test",
      "body": "This is a test notification"
    }
  }'
```

## Architecture

### Connection Flow

1. Client connects with JWT token
2. Server verifies JWT token
3. Server extracts `userId` from token payload
4. Server stores `userId -> socketId` mapping
5. Server emits `connected` event to client
6. Connection is active

### Message Flow (API to User)

1. API endpoint receives request with `userId`
2. Server looks up `socketId` from `userId`
3. Server emits event to specific socket
4. Only that user receives the message

### Disconnection Flow

1. Client disconnects
2. Server removes `userId -> socketId` mapping
3. Cleanup complete

## Security

- ✅ JWT authentication required for all connections
- ✅ No broadcasting - messages are private by default
- ✅ User isolation - users can only receive messages intended for them
- ✅ Token verification on every connection
- ✅ Automatic cleanup on disconnection

## Error Handling

### Common Errors

1. **Authentication Failed**
   - Cause: Invalid or missing JWT token
   - Solution: Ensure valid access token is provided

2. **User Not Connected**
   - Cause: Trying to send message to offline user
   - Solution: Check connection status first or implement offline message queue

3. **Connection Rejected**
   - Cause: Token expired or invalid
   - Solution: Refresh access token and reconnect

## Best Practices

1. **Token Refresh**: Implement automatic token refresh to maintain connection
2. **Reconnection**: Implement automatic reconnection logic on the client
3. **Offline Messages**: Store messages for offline users in database
4. **Rate Limiting**: Implement rate limiting for message sending
5. **Monitoring**: Log connection/disconnection events for monitoring
6. **Graceful Shutdown**: Properly close connections before app shutdown

## Next Steps

- Add message history/persistence
- Implement typing indicators
- Add read receipts
- Implement rooms/channels for group messaging
- Add presence detection (online/offline status)
- Implement message queuing for offline users
