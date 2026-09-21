# Arabic Connect

Build the Private Messaging Platform

Read these three project files completely before writing code:

- "design.md"

- "spec-updated.md"

- "schema.md"

These files are the primary source of truth for the project. Follow their terminology, architecture, security requirements, database structure, and UI direction. Do not replace the planned architecture with a different one unless technically necessary.

Goal

Build a professional private Arabic-first messaging platform with:

- Supabase Authentication

- Supabase PostgreSQL

- Supabase Realtime

- Admin-controlled users

- Admin-controlled communication permissions

- Private one-to-one conversations

- Admin dashboard

- Alerts

- Welcome message

- Platform branding/settings

- Light/Dark mode

- Responsive mobile-first UI

- RTL Arabic interface

- Premium modern visual design

- Smooth, subtle animations

There must be no public user registration.

Users are created and managed by the Admin.

Supabase

Use the connected Supabase project.

Use the Supabase Project URL and Publishable/anon key through environment variables/secrets.

Never expose or use a Supabase Service Role/Secret key in frontend code.

Use "schema.md" as the database source of truth.

Implement:

- All required tables

- Relationships

- Constraints

- Indexes where appropriate

- RLS policies

- Admin authorization

- User authorization

- Realtime configuration required for messaging

Security must be enforced on the backend/database level, not only by hiding frontend buttons.

Authentication

Implement:

- Login with email and password

- Persistent authenticated session

- Logout

- Protected application routes

- Protected Admin routes

- Disabled users cannot use the application

- No public registration page

The Admin role must be determined securely from the database/backend and must never be trusted from client-side state.

Application Structure

Create a clean scalable structure with separate areas for:

User

- Login

- Main application shell

- Authorized conversations

- Chat screen

- Alerts

- Settings

- Profile/theme preferences

Admin

- Dashboard

- Users

- Conversations/communication permissions

- Alerts

- Welcome Message

- Branding

- Settings

- Security

- Activity Log

Only Admin users may access Admin functionality.

Messaging

V1 is strictly one-to-one messaging.

A user must only see conversations they are authorized to participate in.

The Admin controls who can communicate with whom.

Example:

Ahmed ↔ Mohammed = allowed

Ahmed ↔ Samer = not allowed

Users must not be able to:

- Create arbitrary conversations

- Add arbitrary users

- Bypass Admin communication permissions

- Access another conversation by changing an ID in the URL

- Read messages outside their authorized conversations

Implement real-time text messaging using Supabase Realtime.

Support the message states defined in "schema.md".

Branding

The Admin must be able to control the platform branding according to "schema.md", including:

- Platform name

- Logo

- Default theme

- Welcome content/settings where applicable

Changes should persist through Supabase and be reflected in the application.

UI / UX

Follow "design.md" exactly as the visual direction.

Important:

- Arabic RTL

- Mobile-first

- Professional/premium appearance

- Clean typography

- Light mode

- Dark mode

- Smooth animations

- Responsive desktop layout

- Accessible controls

- Avoid generic AI-looking interfaces

- Avoid excessive gradients, glassmorphism, and visual clutter

Do not use fake/static application data where real Supabase data is expected.

Important Development Rules

Before implementing each major feature, verify it against the three provided files.

Do not invent database tables or authentication architecture that conflicts with "schema.md".

Do not remove security restrictions to make development easier.

Do not create fake authentication.

Do not put secret keys in frontend code.

Do not claim end-to-end encryption unless it is actually implemented.

First Phase

For this first implementation phase:

1. Analyze all three files.

2. Set up the project architecture.

3. Connect Supabase.

4. Implement the database schema from "schema.md".

5. Implement RLS and authorization.

6. Configure authentication.

7. Create the protected application structure.

8. Create the Admin/User route structure.

9. Build the initial premium RTL UI shell.

10. Make sure the project runs successfully.

After completing this phase, verify the project for:

- TypeScript/build errors

- Authentication errors

- Supabase connection errors

- RLS/security problems

- Broken routes

- Mobile responsiveness

Do not stop at a mockup. Build the actual functional foundation connected to Supabase.

Keep the code clean, modular, maintainable, and ready for the next implementation phases.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arab-chat-secure.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9f58541f-d321-4f16-9186-d5804028c319).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
