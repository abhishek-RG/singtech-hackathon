# Demo sign-in

SingTech AI Account Intelligence uses a demo sign-in until Supabase Auth is connected. These
are dummy accounts for local demos only. They protect nothing real.

| Role            | Email                           | Password              | Sees                           |
| --------------- | ------------------------------- | --------------------- | ------------------------------ |
| Admin           | `admin@singtech.example`        | `SingTech-Admin-2026` | Every account (10)             |
| Account manager | `aisha.rahman@singtech.example` | `SingTech-Demo-2026`  | Only the accounts she owns (4) |

Sign in at http://localhost:3000/sign-in.

## How it works

- Users live in `apps/server/src/modules/account-intelligence/data/seed/demo-users.json`.
  Only scrypt hashes are stored, never the passwords above.
- A successful sign-in sets an httpOnly, SameSite=Lax cookie holding a signed token
  (HMAC-SHA256). Sessions last 8 hours.
- Every Account Intelligence API route except `/auth/*` needs that session. Admins see every
  account. Account managers see only accounts whose `owner_email` matches theirs; anything
  else answers "not found", the same rule the Supabase RLS policies will enforce.
- Five failed attempts for one email within five minutes are refused for the rest of the
  window.
- Set `SESSION_SECRET` in `.env` for anything beyond a laptop demo. Without it a fixed
  development secret is used, and the server refuses to start a session in production.

## Changing or adding a demo user

```bash
node -e "const c=require('node:crypto');const s=c.randomBytes(16).toString('hex');console.log('scrypt$'+s+'$'+c.scryptSync(process.argv[1],s,32).toString('hex'))" "new-password"
```

Paste the output into `password_hash` in `demo-users.json`.
