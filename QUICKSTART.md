# Quick Start Guide

## 1. Supabase Setup (5 minutes)

1. Create account at https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Copy and paste contents of `supabase/schema.sql`
5. Run the SQL script
6. Note your project URL and anon key from Settings > API
7. Get service role key from Settings > API (keep secret!)

## 2. Create First Admin User

1. Go to Authentication > Users in Supabase Dashboard
2. Click "Add user" > "Create new user"
3. Enter email (e.g., admin@example.com) and password
4. Click "Create user"
5. Copy the user's UUID (shown in the user list)
6. Go to SQL Editor and run:
```sql
INSERT INTO profiles (id, role, default_office_id)
VALUES (
  'PASTE_UUID_HERE',
  'admin',
  '11111111-1111-4111-8111-111111111111'
);
```

Clean installs create the first office automatically with slug `main`.

## 3. Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Run dev server
npm run dev
```

Visit http://localhost:3000 and log in with your admin credentials.

## 4. Deploy to Netlify

1. Push code to GitHub/GitLab
2. Connect repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `apps/web/dist`
5. Add environment variables:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `PRINT_SERVICE_ENABLED` = `false` (or `true` if using print-agent)
   - `PRINT_SERVICE_SECRET` = random secret string
   - `PRINT_SERVICE_OFFICE_SLUG` = office slug for the local print-agent, for example `main`
6. Deploy!

## 5. Create Additional Users

After logging in as admin, go to `/:officeSlug/admin` (for example `/main/admin`) to:
- Create users (create in Supabase Auth first, then assign role in admin panel)
- Assign operators to queues
- Assign users to one or more offices
- Set window number (1-6) for operators - this will be displayed on TV screens
- Configure system settings

### Setting Window Numbers

For operators with role `operator_queue`, you can set a window number from 1 to 6:
1. Go to `/:officeSlug/admin` page
2. Click "Редактировать" (Edit) for an operator user
3. Select "Окно" (Window) dropdown and choose a number (1-6)
4. Click "Сохранить" (Save)

The window number will be displayed on TV screens as "Oyna 1", "Oyna 2", etc. (Uzbek) or "Окно 1", "Окно 2" (Russian).

## Key URLs

- `/login` - Login page
- `/:officeSlug` - Redirect to the role-specific home page for that office
- `/:officeSlug/dashboard` - Dashboard (admin only)
- `/:officeSlug/operator/reg` - Operator workspace for Registration queue
- `/:officeSlug/operator/tech` - Operator workspace for Technical queue
- `/:officeSlug/issue` - Issue tickets (reception_security role)
- `/screen/:officeSlug` - TV screens display
- `/:officeSlug/reports` - Reports (admin only)
- `/:officeSlug/admin` - User and office management (admin only)
- `/:officeSlug/settings` - Office and system settings (admin only)

Legacy routes without office slug still redirect, but new bookmarks and integrations should use the explicit office-aware routes.

## UI/UX Improvements

The application now features:
- **Responsive Layout**: Works on mobile, tablet, and desktop
- **Sidebar Navigation**: Easy menu navigation with role-based access
- **Top Bar**: Shows current user and logout button
- **Modern UI Components**: Consistent design with Tailwind CSS
- **Error Handling**: Better error messages and loading states

## Existing Installation Migration

If you already have a working single-office installation, apply:
1. `supabase/migrations/005_add_multi_office_support.sql`
2. This creates the `offices` and `profile_offices` model, backfills existing data into the bootstrap office, and updates the access policies

## Troubleshooting

**Can't log in?**
- Check user exists in Supabase Auth
- Check profile exists in `profiles` table
- Verify role is set correctly

**Functions not working?**
- Check environment variables in Netlify
- Verify Supabase RLS policies are set
- Check Netlify function logs

**Printing not working?**
- Browser print: Check browser print settings
- ESC/POS: See `print-agent/README.md`
