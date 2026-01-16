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
INSERT INTO profiles (id, role)
VALUES ('PASTE_UUID_HERE', 'admin');
```

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
6. Deploy!

## 5. Create Additional Users

After logging in as admin, go to `/queue/admin` to:
- Create users (create in Supabase Auth first, then assign role in admin panel)
- Assign operators to queues
- Set window labels
- Configure system settings

## Key URLs

- `/login` - Login page
- `/dashboard` - Dashboard (admin only)
- `/operator/reg` - Operator workspace for Registration queue
- `/operator/tech` - Operator workspace for Technical queue
- `/issue` - Issue tickets (reception_security role)
- `/screens` - TV screens display
- `/reports` - Reports (admin only)
- `/admin` - User management (admin only)
- `/settings` - System settings (admin only)

## UI/UX Improvements

The application now features:
- **Responsive Layout**: Works on mobile, tablet, and desktop
- **Sidebar Navigation**: Easy menu navigation with role-based access
- **Top Bar**: Shows current user and logout button
- **Modern UI Components**: Consistent design with Tailwind CSS
- **Error Handling**: Better error messages and loading states

## RLS Fix

If you see blank screen or 500 errors after login, run the migration:
1. Go to Supabase Dashboard > SQL Editor
2. Run the contents of `supabase/migrations/001_fix_profiles_rls.sql`
3. This fixes recursive RLS policies that can cause errors

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
