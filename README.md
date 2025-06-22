# Logistics Management System

A comprehensive logistics management system built with the PERN-MB stack (PostgreSQL, Express.js, React.js, Node.js with Module-Boundary Architecture).

## Features

- User Management
- Order Management
- Vehicle Management
- Route Optimization
- Notification & Tracking

## Architecture

This project follows a Module-Boundary Architecture, where each functional module is independent with clear boundaries, yet follows a consistent structure.

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn

### Installation

1. Clone the repository
2. Install server dependencies:
   ```
   cd server
   npm install
   ```
3. Install client dependencies:
   ```
   cd client
   npm install
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env` in both server and client directories
   - Update the variables as needed

### Running the Application

1. Start the server:
   ```
   cd server
   npm run dev
   ```

2. Start the client:
   ```
   cd client
   npm start
   ```

## Project Structure

The project follows a modular structure with clear boundaries between functional areas:

```
logistics-system/
├── server/               # Backend application
│   ├── modules/          # Business modules with clear boundaries
│   │   ├── users/        # User management
│   │   ├── orders/       # Order management
│   │   ├── vehicles/     # Vehicle management
│   │   ├── routes/       # Route optimization
│   │   └── notifications/ # Notifications & tracking
│   ├── middleware/       # Shared middleware
│   ├── utils/            # Shared utilities
│   └── config/           # Configuration
├── client/               # Frontend React application
```

## Module Communication

Modules communicate through:
1. Direct Service Imports for synchronous operations
2. Event-Based Communication for asynchronous operations

## License

MIT
