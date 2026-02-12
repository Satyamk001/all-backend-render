# Kuku Fun - Backend

The microservice backend for the Kuku Fun chat application, built with **Node.js**, **Express**, and **Socket.io**.

## Features

-   **Real-time Socket Server**: Handles instant messaging, typing indicators, and user presence.
-   **File Upload API**: Secure file uploads to Cloudinary with support for various file types.
-   **File Management**: Endpoints for uploading and securely deleting files.
-   **REST API**: User management and chat history retrieval.

## Version History

### [v1.0.1] - 2026-02-09
**Added:**
-   **Multi-Type Uploads**: Updated logic to handle Images, PDFs, Docs, and Text files.
-   **Smart Resource Type**: Automatically detects file type (`resource_type: 'auto'`) while preserving extensions for raw files (fixing PDF download issues).
-   **File Deletion Endpoint**: `POST /api/upload/delete` to safely remove files from Cloudinary using `public_id` or URL.

### [v2.0.0] - 2026-02-12
**Major Release: Topic Rooms Module**
- **Topic Rooms API**: Endpoints for creating, listing, and joining ephemeral chat rooms.
- **Socket.IO Namespaces**: Dedicated `/rooms` namespace for scalable room-based real-time communication.
- **Database Schema**: New `topic_rooms`, `room_participants`, and `room_messages` tables.
- **User Caching**: Optimized `getUserFromClerk` with caching to improve authentication performance during socket connections.

### [v3.0.0] - 2026-02-12
**Major Release: Friend System & Restrictions**
- **Friend Module**: Full backend support for sending, accepting, and rejecting friend requests.
- **Chat Restrictions**: Enforced logic preventing DMs between non-friends.
- **Notifications**: Enhanced notification system to support friend-related events (`FRIEND_REQUEST`, `FRIEND_ACCEPTED`, `FRIEND_REJECTED`) with real-time socket delivery.
- **Database Migrations**: Consolidated migrations into `001_schema_init.sql` and `002_chat_features.sql` for cleaner architecture.
- **API**: New endpoints for user search and friend management.

## Tech Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Real-time**: Socket.io
-   **Storage**: Cloudinary
-   **Database**: PostgreSQL

## API Endpoints

### Uploads
-   `POST /api/upload/image-upload`: Upload a file.
    -   **Body**: `multipart/form-data` with `file` field.
    -   **Returns**: JSON with `url`, `secure_url`, `resourceType`, `format`.
-   `POST /api/upload/delete`: Delete a file.
    -   **Body**: JSON `{ "url": "...", "resourceType": "image|raw" }`.

### Chat
-   `GET /api/chat/conversations/:userId/messages`: Get paginated messages.

### Friends (New in v3.0.0)
-   `GET /api/users/search`: Search for users to add.
-   `POST /api/friends/request`: Send a friend request.
-   `POST /api/friends/respond`: Accept or Reject a request.
-   `GET /api/friends/requests`: List pending incoming requests.
-   `GET /api/friends`: List all active friends.

### Topic Rooms
- `GET /api/rooms`: List active rooms (supports `category` and `search` query params).
- `POST /api/rooms`: Create a new room. Body: `{ title, category, durationMinutes, maxUsers }`.
- `GET /api/rooms/:id`: Get room details.
- `GET /api/rooms/:id/messages`: Get message history for a room.

## Socket.IO Events

### Namespace: `/` (Default)
- **Server -> Client**:
    - `notification:new`: Real-time alerts for friend requests, likes, replies.

### Namespace: `/rooms`
- **Client -> Server**:
    - `room:join`: Join a specific room.
    - `room:leave`: Leave a room.
    - `room:message`: Send a message to the room.
- **Server -> Client**:
    - `ready`: Connection established and handlers registered.
    - `room:message`: New message received.
    - `room:participant_update`: Participant count updated.
    - `room:error`: Error notification.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file with the following:
    ```env
    PORT=5000
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    # Add other DB/Auth vars
    ```

3.  **Start Server**:
    ```bash
    npm run dev
    ```

## Development

-   **Build**: `npm run build`
-   **Start**: `npm start`
