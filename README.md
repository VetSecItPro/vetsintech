# VetsInTech Learning Platform

A custom EdTech platform built for veteran education — course delivery, community discussions, and unified progress tracking across multiple learning platforms.

## Features

- **Course Management** — Create courses with modules, rich content lessons, quizzes, and certificates
- **Student Portal** — Dashboard, course player, progress tracking, and community discussions
- **Admin Dashboard** — Analytics, student management, cohort enrollment, and role-based access
- **External Integrations** — Aggregate student progress from Coursera, Pluralsight, and Udemy
- **Community** — Discussion boards, announcements, notifications, and student profiles

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** (Postgres, Auth, Storage, Realtime)
- **Tailwind CSS** + **shadcn/ui**
- **Tiptap** (rich text editor)
- **Vercel** (hosting)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials

# Run development server
npm run dev
```

## License

All rights reserved. See [LICENSE](LICENSE) for details.
