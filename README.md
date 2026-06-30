# Community Hero

Hyperlocal civic grievance management platform for municipalities.

**Pilot deployment:** Kolkata Municipal Corporation, West Bengal, India

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Status: Production-Ready](https://img.shields.io/badge/Status-Production--Ready-success)

## Live Demo

Frontend:
https://community-hero-57477.web.app

Backend API:
https://community-hero-api-621705864569.asia-south2.run.app

## Overview

Community Hero helps cities manage civic complaints from the first citizen report through assignment, field resolution, verification, and final confirmation. It combines a citizen-facing issue reporting flow with role-based department and worker operations, AI-assisted categorization and verification, maps, analytics, notifications, and gamification.

The system is designed as a multi-city platform. The current configuration supports Kolkata Municipal Corporation, but the deployment model is driven by shared configuration so another city can be introduced with minimal code changes.

## What It Solves

Traditional civic complaint systems often struggle with fragmented reporting, poor visibility, and limited accountability. Community Hero addresses that by providing:

- A single reporting channel for citizens
- Real-time issue tracking and status transparency
- Duplicate detection to reduce repeated complaints
- SLA-based escalation for overdue work
- AI assistance for issue classification, prioritization, and verification
- Analytics for municipal decision-making
- A feedback loop through citizen confirmation and reopening workflows

## Core Capabilities

### Citizen Experience

- Report issues with title, description, category, severity, location, and media
- Use map-based location selection or geolocation
- Receive AI-assisted summaries and categorization
- Track issue timelines and status changes
- Support existing issues and contribute to community visibility
- Confirm resolution or flag incomplete work
- View issues on an interactive map
- Earn points and badges for useful participation

### Department Operations

- Review and manage assigned issues
- Accept, reject, escalate, or reassign work
- Assign tasks to field workers
- Add internal comments for coordination
- Inspect related nearby issues for context

### Field Worker Workflow

- View assigned tasks and workload status
- Start, pause, and complete work
- Upload before and after photos from the field
- Trigger AI-based verification on completion
- Earn resolution points and badges

### Municipal Oversight

- Monitor city-wide issue trends and performance
- Review ward, borough, department, and priority metrics
- Inspect resolution times, satisfaction, and SLA compliance
- Compare department performance using dashboards and rankings

## AI and Automation

Community Hero uses specialized AI and automation to support operations:

- Vision analysis for uploaded issue images
- Location enrichment using geocoding and nearby places
- Duplicate detection based on proximity and text similarity
- Priority scoring using severity, context, and nearby landmarks
- Before/after verification for completed work
- Notification routing for citizens, workers, departments, and administrators

## Architecture At A Glance

The application uses a three-tier architecture with a governance layer around external services:

- Frontend: Next.js app router, React components, hooks, and context
- API: Express.js REST server with middleware-driven auth and governance
- Data: Firestore, with REST and in-memory fallback paths for resilience
- Integrations: Firebase Auth, Firebase Storage, Groq, and Google Maps

The governance layer adds:

- Request context tracking
- Timed caching
- Rate limiting and quotas
- Timeout handling
- Retry behavior
- In-flight request deduplication

## Tech Stack

### Frontend

- Next.js 16
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Framer Motion

### Backend

- Node.js
- Express.js
- Helmet
- CORS
- Morgan
- Multer

### Data and Identity

- Firebase Authentication
- Firebase Firestore
- Firebase Cloud Storage
- Firebase Admin SDK

### AI and Maps

- Groq API
- Llama 3.3 70B
- Llama 4 Scout 17B
- Google Maps Platform

## Repository Structure

- `client/` - Next.js frontend
- `server/` - Express API
- `shared/` - Shared configuration, constants, enums, and types
- `docs/` - Architecture, schema, API, auth, and roadmap documentation
- `ward.md` - Ward catalog source data

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Firebase project and credentials
- Groq API key
- Google Maps API key

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and provide values for the required services.

Key environment groups include:

- Server: `PORT`, `NODE_ENV`, `CLIENT_URL`
- Feature flags: `ENABLE_AI`, `ENABLE_MAPS`, `ENABLE_CHATBOT`, `ENABLE_FIREBASE`, `DEMO_MODE`
- Firebase server credentials: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- Firebase client config: `NEXT_PUBLIC_FIREBASE_*`
- AI: `GROQ_API_KEY`
- Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY`

See [.env.example](.env.example) for the full list.

### Run Locally

Start the full development stack:

```bash
npm run dev
```

Run the apps separately if needed:

```bash
npm run dev:client
npm run dev:server
```

By default:

- Client: `http://localhost:3000`
- Server: `http://localhost:5000`

## Common Scripts

From the repository root:

```bash
npm run dev         # Run client and server together
npm run dev:client  # Start only the Next.js client
npm run dev:server  # Start only the Express server
npm run build       # Build the client for production
npm start           # Start the server in production mode
npm run seed        # Seed demo data
```

Package-specific scripts:

- `client`: `npm run build`, `npm run start`, `npm run lint`
- `server`: `npm run dev`, `npm run start`

## Demo Data

To seed the demo dataset used for pilot or offline development:

```bash
npm run seed
```

This populates a realistic issue set and supporting records so the product can be explored without live municipal data.

## Security And Reliability

Community Hero is built with operational safeguards suited to public-sector systems:

- Firebase token-based authentication
- Role-based access control for citizens, volunteers, departments, workers, authorities, and admins
- Department and worker data isolation
- Security headers via Helmet
- CORS restrictions for the configured client origin
- Request quotas and burst limiting
- Timeouts, retries, and caching on external calls
- Audit-friendly request logging

## Documentation

Additional implementation details live in the `docs/` directory:

- [System Architecture](docs/01_system_architecture.md)
- [Firestore Schema](docs/02_firestore_schema.md)
- [API Flow](docs/03_api_flow.md)
- [Authentication Flow](docs/04_authentication_flow.md)
- [Complaint Lifecycle](docs/05_complaint_lifecycle.md)
- [Folder Structure](docs/06_folder_structure.md)
- [Tech Stack](docs/07_tech_stack.md)
- [Future Scope](docs/08_future_scope.md)

## Deployment Notes

The platform is intended to be configured per city through shared deployment settings. To adapt Community Hero for a new municipality:

1. Update the shared deployment configuration.
2. Replace the ward catalog with the target city's ward structure.
3. Configure Firebase, Groq, and Google Maps credentials.
4. Build and deploy the client and server.

## Contributing

If you extend the project, please keep changes aligned with the existing architecture:

- Place reusable business logic in `server/services/`
- Keep controllers thin
- Prefer shared configuration over hard-coded city-specific values
- Update documentation when behavior or setup changes

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

Community Hero is built to connect citizens and municipalities through clearer reporting, faster action, and better accountability.
