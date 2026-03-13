# Auth Module

## Purpose

Handles all authentication-related logic for Conquer Classic Plus.

**Two types of users:**
- **Admin** (`role: "admin"`) — access to `/admin/*`. Created manually via Supabase Dashboard.
- **Player** (`role: "player"`) — access to `/[locale]/[version]/myaccount`. Self-registered via the public registration form.

## Public Exports (`index.ts`)

### Types
| Type | Description |
|---|---|
| `AuthUser` | Full user object (id, email, username, role, in_game_name, banned) |
| `LoginInput` | Email + password for login form |
| `RegisterInput` | Username, email, password, confirmPassword for registration |

### Server Actions
| Function | Description |
|---|---|
| `loginAction(input)` | Signs in with email/password via Supabase Auth |
| `registerAction(input)` | Registers a new player, creates `profiles` row |
| `logoutAction()` | Signs out, invalidates session, redirects to `/` |
| `changePasswordAction(newPassword)` | Updates password for logged-in user |

### Queries
| Function | Description |
|---|---|
| `getCurrentUser()` | Returns `AuthUser` or `null` for the current session |
| `isAdmin()` | Returns `true` if current user has the `admin` role |

## How to Create the First Admin

1. Register normally via the public `/register` page (creates a player account).
2. Go to **Supabase Dashboard → Authentication → Users**.
3. Click the user → edit **User Metadata**.
4. Change `{ "role": "player" }` to `{ "role": "admin" }`.
5. Save. The user now has admin access.

Alternatively, run in SQL Editor:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@yourdomain.com';

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

## How to Extend

- **OAuth providers** (Google, Discord): add to `loginAction` with `supabase.auth.signInWithOAuth()`.
- **Password reset**: add `resetPasswordAction(email)` using `supabase.auth.resetPasswordForEmail()`.
- **Email verification**: Supabase handles this automatically when enabled in Dashboard → Auth → Settings.
