# Nexo — Personal Finance Dashboard

A personal finance dashboard built with **React + Vite**, backed directly by **Supabase** (Postgres + Auth) — no custom backend server. Track expenses and income, organize them by category, set up recurring transactions, and save toward goals ("caixinhas").

> **Status: personal project / MVP.** This is a side project I built to manage my own finances and to learn/experiment along the way. Scope, data model, and UI are still evolving. Expect rough edges, and use it with that in mind — especially before trusting it with real financial data of your own.

Live demo: https://daviosad.github.io/Finances-Dashboard/

## Features

- **Transactions** — add, edit, and delete expenses and income, organized under categories with one level of subcategories.
- **Recurring transactions** — mark a transaction as recurring and it's virtually projected onto every future month (no duplicated rows, no cron job), optionally capped to a number of installments (e.g. "6x").
- **Goals ("caixinhas")** — savings goals with a target amount, optional deadline, and support for BRL or USD; funding/withdrawing a goal is logged as a transaction automatically.
- **Monthly overview** — income/expense/balance summary cards, an accumulated balance across all months, and a category breakdown chart.
- **History & filtering** — searchable, filterable transaction history with a details view for each entry.
- **CSV export** — export the visible transactions to CSV.
- **Auth** — email/password login and registration, password recovery, session expiry after inactivity, and self-service account deletion, all via Supabase Auth.

## Tech stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres, Auth, Row Level Security)
- [Fontsource](https://fontsource.org/) (Bricolage Grotesque + Hanken Grotesk), self-hosted so the CSP can stay `font-src 'self'`
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests

The UI copy is in Portuguese (pt-BR), since it was originally built for personal use — the codebase itself (code, comments, this README) is in English.

## Project structure

```
src/
  main.jsx, App.jsx           # entry point; auth/session gate that switches between Auth, ResetPassword and Dashboard
  supabaseClient.js           # Supabase client init
  components/
    Auth.jsx                  # login / register / password recovery
    ResetPassword.jsx         # shown when following a password-recovery link
    Dashboard.jsx             # the authenticated app: view state + cross-entity handlers
    dashboard/                # presentational pieces (summary, charts, history, goals, modals/)
  hooks/
    useFinanceData.js         # all Supabase reads/writes for expenses, categories and goals
    useSessionExpiry.js       # keeps the "last active" timestamp used for session expiry
    useBodyScrollLock.js
  lib/                        # framework-free helpers: dates, formatters, categories,
                               # recurrence expansion, CSV export — the easiest place to add unit tests
  __tests__/                  # component tests (Testing Library) and lib unit tests
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and set up the database (see [Database](#database) below).

3. Create a `.env` file in the project root with your Supabase project's URL and anon key:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the dev server:

```bash
npm run dev
```

## Testing

```bash
npm test          # vitest, watch mode
npm run test:ui   # vitest with the UI runner
```

Run a single file: `npx vitest run src/__tests__/components/Dashboard.test.jsx`
Run tests matching a name: `npx vitest run -t "some test name"`

## Database

Run this in the Supabase SQL Editor to create the schema:

```sql
CREATE TABLE categories (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	name TEXT NOT NULL,
	type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
	parent_id UUID REFERENCES categories(id),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE expenses (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	category_id UUID REFERENCES categories(id) NOT NULL,
	type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
	amount DECIMAL(10, 2) NOT NULL,
	description TEXT,
	expense_date DATE NOT NULL,
	is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
	recurrence_end_date DATE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goals (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	name TEXT NOT NULL,
	target_amount DECIMAL(10, 2) NOT NULL,
	current_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
	currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
	deadline DATE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Full access to own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Full access to own goals" ON goals FOR ALL USING (auth.uid() = user_id);
```

### Migrations

For pre-existing databases, run these in the SQL Editor as they're added.

Deadline for recurring transactions (last month charged; `NULL` = repeats forever):

```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
```

Self-service account deletion (the client never has the service role key, so deleting the
user from `auth.users` has to go through a `SECURITY DEFINER` function; `SET search_path`
guards against search_path hijacking in that kind of function). Supabase grants EXECUTE on
every new function in the `public` schema to `anon`/`authenticated`/`service_role` by default
(via `ALTER DEFAULT PRIVILEGES`), so it needs to be revoked from `anon` explicitly — revoking
from `PUBLIC` alone isn't enough:

```sql
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	DELETE FROM expenses WHERE user_id = auth.uid();
	DELETE FROM goals WHERE user_id = auth.uid();
	DELETE FROM categories WHERE user_id = auth.uid();
	DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_own_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
```

## Deployment

The project deploys to GitHub Pages automatically on every push to `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), using
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from GitHub Actions secrets. There is no
separate CI test/lint gate — pushing to `main` deploys directly.

To deploy your own fork:

1. Set `base` in `vite.config.js` to match your repository name.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets.
3. Push to `main`, or build and publish `dist/` manually:

```bash
npm run build
```

## Known limitations

- No automated security review; treat this as a personal/learning project rather than a hardened financial product.
- Session expiry (`src/lib/session.js`) is a UX guard against a forgotten open tab, not a real security boundary — actual session lifetime is controlled in the Supabase dashboard.

## License

No license has been chosen yet — all rights reserved by default. Send me an email if you'd like to use this code and licensing terms matter to you.
