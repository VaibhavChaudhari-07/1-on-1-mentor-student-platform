// MongoDB Schema Design for Mentor-Student Platform

// 1. Users Collection
// Handles authentication and profiles
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "email", "role", "created_at"],
      properties: {
        _id: {
          bsonType: "objectId",
          description: "Unique identifier for the user"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "User's email address"
        },
        role: {
          enum: ["mentor", "student"],
          description: "User role: mentor or student"
        },
        created_at: {
          bsonType: "date",
          description: "Account creation timestamp"
        },
        // Optional fields
        name: {
          bsonType: "string",
          description: "User's display name"
        },
        avatar: {
          bsonType: "string",
          description: "Profile picture URL"
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// 2. Sessions Collection
// Manages mentoring sessions
db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "mentor_id", "status", "created_at"],
      properties: {
        _id: {
          bsonType: "objectId",
          description: "Unique identifier for the session"
        },
        mentor_id: {
          bsonType: "objectId",
          description: "Reference to mentor user"
        },
        student_id: {
          bsonType: ["objectId", "null"],
          description: "Reference to student user (optional, max 1 student)"
        },
        status: {
          enum: ["active", "ended"],
          description: "Session status"
        },
        created_at: {
          bsonType: "date",
          description: "Session creation timestamp"
        },
        ended_at: {
          bsonType: ["date", "null"],
          description: "Session end timestamp (when status becomes ended)"
        },
        // Optional metadata
        title: {
          bsonType: "string",
          description: "Session title/description"
        }
      }
    }
  }
});

// Create indexes
db.sessions.createIndex({ mentor_id: 1 });
db.sessions.createIndex({ student_id: 1 });
db.sessions.createIndex({ status: 1 });
db.sessions.createIndex({ created_at: -1 });

// 3. Messages Collection
// Stores chat messages
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "session_id", "sender_id", "content", "timestamp"],
      properties: {
        _id: {
          bsonType: "objectId",
          description: "Unique identifier for the message"
        },
        session_id: {
          bsonType: "objectId",
          description: "Reference to the session"
        },
        sender_id: {
          bsonType: "objectId",
          description: "Reference to the sender user"
        },
        content: {
          bsonType: "string",
          maxLength: 1000,
          description: "Message content"
        },
        timestamp: {
          bsonType: "date",
          description: "Message timestamp"
        },
        // Optional fields
        message_type: {
          enum: ["text", "code", "system"],
          default: "text",
          description: "Type of message"
        }
      }
    }
  }
});

// Create indexes
db.messages.createIndex({ session_id: 1 });
db.messages.createIndex({ sender_id: 1 });
db.messages.createIndex({ timestamp: -1 });
db.messages.createIndex({ session_id: 1, timestamp: -1 }); // Compound index for efficient queries

// Example documents:

// User document
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "mentor@example.com",
  "role": "mentor",
  "name": "John Doe",
  "created_at": ISODate("2024-01-01T00:00:00Z")
}

// Session document
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "mentor_id": ObjectId("507f1f77bcf86cd799439011"),
  "student_id": ObjectId("507f1f77bcf86cd799439013"),
  "status": "active",
  "created_at": ISODate("2024-01-01T10:00:00Z"),
  "title": "JavaScript Fundamentals"
}

// Message document
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "session_id": ObjectId("507f1f77bcf86cd799439012"),
  "sender_id": ObjectId("507f1f77bcf86cd799439011"),
  "content": "Let's start with variables in JavaScript",
  "timestamp": ISODate("2024-01-01T10:05:00Z"),
  "message_type": "text"
}