# Driver Electronic Queue System

Production-ready browser-based electronic queue system for drivers with two independent queues (Registration and Technical Questions) and strict multi-office isolation inside one installation.

## Features

- **Two Independent Queues**
  - Queue A: Registration of new drivers (prefix "R")
  - Queue B: Technical questions for registered drivers (prefix "T")
- **Multi-Office Ready**
  - One installation can serve multiple offices with explicit office scoping
  - Office context is enforced in database, API, frontend routing, and live updates
- **Role-Aware Office Access**
  - Admins can switch between offices
  - Office users only see the offices assigned to them
- **Ticket Issuing** - Reception/security can issue tickets via web UI
- **Operator Workspaces** - Operators see only their assigned queue
- **TV Screens** - Internal/external screens showing queue status with auto-update
- **Voice Announcements** - Optional browser-based announcements when tickets are called
- **Reports** - Daily totals, by queue type, by operator with Excel export
- **Data Retention** - Records kept for at least 90 calendar days

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **UI**: Tailwind CSS
- **Routing**: React Router
- **State Management**: TanStack Query (React Query)
- **Backend**: Netlify Functions (TypeScript)
- **Database/Auth**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Time Handling**: Luxon (Asia/Tashkent timezone)
- **Excel Export**: ExcelJS

## Prerequisites

- Node.js 18+
- Supabase account
- Netlify account (for deployment)

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Note your project URL and anon key from Settings > API
4. Get your service role key from Settings > API (keep this secret!)

For an existing single-office installation, do not reload the schema from scratch. Apply `supabase/migrations/005_add_multi_office_support.sql` to migrate the current office safely into the new office-aware model.

### 2. Local Development

1. Clone the repository:
```bash
cd DRIVERQUEUE
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE=/.netlify/functions
```

5. Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

### 3. Create First Admin User

After setting up Supabase:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter email and password, then create the user
4. Copy the user's UUID
5. Go to SQL Editor and run:
```sql
INSERT INTO profiles (id, role, default_office_id)
VALUES (
  'USER_UUID_HERE',
  'admin',
  '11111111-1111-4111-8111-111111111111'
);
```

Replace `USER_UUID_HERE` with the actual UUID from step 3.

Clean installs bootstrap the first office automatically:
- Office ID: `11111111-1111-4111-8111-111111111111`
- Office code: `main`
- Office slug: `main`

Now you can log in with this admin account and manage other users through the admin panel.

### 4. Netlify Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)

2. Connect your repository to Netlify:
   - Go to https://app.netlify.com
   - Click "Add new site" > "Import an existing project"
   - Connect your Git repository

3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `apps/web/dist`

4. Set environment variables in Netlify Dashboard > Site settings > Environment variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PRINT_SERVICE_ENABLED=false
   PRINT_SERVICE_SECRET=your-random-secret-key
   PRINT_SERVICE_OFFICE_SLUG=main
   ```

5. Deploy!

### 5. Configure CORS (if needed)

If you encounter CORS issues, add your Netlify site URL to Supabase Dashboard > Settings > API > Allowed origins.

## User Roles

- **admin**: Full access across all offices, can switch office context, manage users/offices/settings
- **reception_security**: Issue tickets and print inside assigned office context
- **operator_queue**: Access operator panel inside assigned office context

## Queue Behavior

### Ticket Numbering
- Registration queue: R-001, R-002, ...
- Tech queue: T-001, T-002, ...
- Numbers reset daily at 00:00 Asia/Tashkent
- Atomic increment ensures no duplicates

### Ticket Lifecycle
WAITING → CALLED → SERVING → DONE
Also supports: NO_SHOW, CANCELLED

## Printing

The system supports two printing modes:

### A) Browser Print (Default)
- Works everywhere
- Renders a print-friendly ticket page (58/80mm)
- Triggers `window.print()` automatically
- No additional setup required

### B) Bluetooth ESC/POS Print Service (Optional)
- For best UX with thermal printers
- Requires the optional print-agent service
- See `print-agent/README.md` for setup

**Supported Printers:**
- Xprinter XP-P300 / XP-P323
- Rongta RP-P300
- Gprinter GP-M322
- Other ESC/POS compatible printers

## Pages

- `/login` - User authentication
- `/:officeSlug` - Redirect to the role-specific home page for the selected office
- `/:officeSlug/dashboard` - Dashboard (admin)
- `/:officeSlug/issue` - Issue tickets (admin, reception_security)
- `/:officeSlug/operator/:queueType` - Operator workspace for `reg` or `tech` (admin, operator_queue)
- `/:officeSlug/reports` - Reports with filters and export (admin)
- `/:officeSlug/admin` - Users and offices management (admin)
- `/:officeSlug/settings` - Office and global settings (admin)
- `/:officeSlug/print` - Browser print page for the selected office
- `/screen/:officeSlug` - Public queue screen (internal mode by default)
- `/screen/:officeSlug/:mode` - Public queue screen for `internal` or `external`

Legacy routes like `/queue/issue` and `/queue/screens/internal` still redirect into the current office, but new integrations should always use the explicit office-aware routes above.

## Screens Configuration

TV screens auto-update every 1-2 seconds via polling. They show:
- Current called/serving tickets per queue with window number (1-6)
- Waiting queue lists (first 10 tickets per queue type)
- Large, high-contrast typography optimized for TV displays
- Uzbek language interface (Latin script) by default
- Fullscreen mode with auto-hide cursor
- Optional voice announcements in Uzbek

### Screen Features

- **Language**: Uzbek (Latin) by default, with Russian option
- **Window Display**: Shows window numbers 1-6 clearly (e.g., "Oyna 1", "Oyna 2")
- **Queue Types**: 
  - R-xxx = Ro'yxatdan o'tish (Registration)
  - T-xxx = Texnik yordam (Technical Support)
- **Active Calls**: Large display showing ticket number → window number
- **Waiting Queue**: Shows next 10 tickets per queue type
- **Fullscreen**: Click fullscreen button for TV mode (cursor auto-hides)

### Setting Window Numbers

In the Admin panel (`/:officeSlug/admin`):
1. Edit an operator user (role: `operator_queue`)
2. Select window number from dropdown (1-6)
3. Window will be displayed on screens as "Oyna N" (Uzbek) or "Окно N" (Russian)

## Reports

Reports include:
- Daily totals
- By queue type (REG/TECH)
- By operator
- Average service time
- Date range filters
- Excel export (.xlsx)

## Data Retention

- Records are kept for at least 90 calendar days
- No automatic deletion
- Admin can configure retention days in settings
- Optional manual cleanup for records older than N days

## Environment Variables

### Frontend (.env)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_BASE` - API base path (default: `/.netlify/functions`)

### Netlify Functions (set in Netlify dashboard)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
- `PRINT_SERVICE_ENABLED` - Enable print service integration (true/false)
- `PRINT_SERVICE_SECRET` - Secret key for print-agent authentication
- `PRINT_SERVICE_OFFICE_SLUG` - Office slug used by the local print-agent when polling jobs

## Troubleshooting

### Authentication Issues
- Ensure Supabase RLS policies are correctly set up
- Check that user profiles exist in the `profiles` table
- Verify JWT tokens are being sent in API requests

### Queue Not Updating
- Check browser console for errors
- Verify Netlify Functions are deployed correctly
- Check Supabase connection and RLS policies

### Printing Issues
- For browser print: Check browser print settings and printer drivers
- For ESC/POS: Verify print-agent is running and printer is connected
- Check print job status in database if using print service

## Development

### Project Structure
```
/
├── apps/web/          # Frontend React app
│   └── src/
│       ├── pages/     # Page components
│       ├── components/# Reusable components
│       ├── lib/       # Utilities (supabase, api, auth)
│       └── types/     # TypeScript types
├── netlify/functions/ # Netlify Functions (backend)
│   ├── _shared/       # Shared utilities
│   └── *.ts           # Function handlers
├── supabase/          # Database schema
│   └── schema.sql
├── print-agent/       # Optional print service
└── docs/              # Documentation
```

### Running Locally

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

### Testing Netlify Functions Locally

Use Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```

## License

MIT

## Support

For issues and questions, please check:
1. Supabase documentation: https://supabase.com/docs
2. Netlify documentation: https://docs.netlify.com
3. React Query documentation: https://tanstack.com/query/latest
#   d r i v e r s q u e u e  
 
