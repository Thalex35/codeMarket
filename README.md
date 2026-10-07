# CodeMarket

CodeMarket is a software discovery and distribution platform for browsing applications, learning about them, and downloading them.

> Discover. Download. Build.

## About the Project

CodeMarket brings software information and downloads together in one searchable catalog. Visitors can explore published software, compare details, and find applications by category, platform, or price. Registered users can manage their profile, favorites, downloads, and purchases.

The project currently focuses on software discovery and distribution. It is an actively developed MVP, with a single-admin publishing model; a broader, multi-vendor marketplace may be explored in the future.

## Features

- Browse a catalog of published software, with search, category/platform/price filters, and sorting
- View software details, available versions, and download information
- Create an account, sign in, and manage a user profile
- Like software and review favorites, download history, and purchases
- Download software through the application, with purchase checks for paid downloads
- Support paid purchases through configured payment options, including the implemented MonCash integration
- Use a role-separated admin area to manage software and versions, users, purchases, downloads, likes, settings, contact messages, and analytics
- Responsive layouts for public and admin pages
- Supabase-backed authentication, database, and storage

## Tech Stack

- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- [TanStack Start](https://tanstack.com/start/) and [TanStack Router](https://tanstack.com/router/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) and shadcn/ui-style components built with Radix UI
- [Lucide](https://lucide.dev/) icons
- [TanStack Query](https://tanstack.com/query/)
- [Supabase](https://supabase.com/) with PostgreSQL
- [Bun](https://bun.sh/) for package management and project scripts

## Project Structure

```text
src/
  components/       Shared UI, site, software, and admin components
  hooks/            Authentication, software, and site-settings hooks
  integrations/     Supabase and Lovable integrations
  lib/              Catalog, media, payments, analytics, and utility logic
  routes/           File-based public, authenticated, admin, and API routes
  router.tsx        TanStack Router setup
  server.ts         Server entry and error-response handling
supabase/
  migrations/       Database schema and policy migrations
  config.toml       Local Supabase configuration
public/             Static assets
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (the project includes a `bun.lock`)
- A Supabase project with the project's database migrations applied

### Run locally

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Thalex35/codeMarket.git
   cd codeMarket
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env.local` file in the project root and configure the required variables below.

4. Start the development server:

   ```bash
   bun run dev
   ```

   Open the local URL printed by Vite in your terminal.

## Environment Variables

Set the required Supabase values in the server environment used to run the application:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key used by the application |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for privileged operations; never expose it to the browser or commit it |

The client also accepts `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time alternatives for the URL and publishable key. These are public client configuration values, not secrets. Do not use a service-role or secret key in a `VITE_` variable.

The following variables are optional and only needed for the corresponding integrations:

| Variable | Purpose |
| --- | --- |
| `MONCASH_CLIENT_ID` | MonCash client ID when Official MonCash payments are enabled |
| `MONCASH_CLIENT_SECRET` | Server-only MonCash client secret |
| `MONCASH_MODE` | Set to `live` to use the live MonCash API; otherwise the integration uses sandbox mode |
| `MONCASH_AMOUNT_MULTIPLIER` | Optional positive amount multiplier; defaults to `1` |
| `PUBLIC_APP_URL` | Public application URL used for MonCash payment redirects |
| `TURNSTILE_SECRET_KEY` | Optional server-only Cloudflare Turnstile secret for contact-form verification |

Keep secret values in local, ignored environment files or your deployment provider's secret store. Never commit real credentials.

## Development

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun run build` | Create a production build |
| `bun run build:dev` | Create a development-mode build |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |
| `bun run test` | Run the Bun test suite |
| `bun run verify` | Run linting, tests, and a production build |

## Project Status

CodeMarket is actively developed. The current version is an MVP focused on software discovery, distribution, and administration. Features described as future directions below are not represented as implemented functionality.

## Roadmap

Potential future work includes:

- Explore support for independent software publishers and a multi-vendor marketplace
- Continue improving catalog discovery and the user experience
- Expand integrations and operational tooling based on project needs

These are planned directions, not current features or delivery commitments.

## Contributing

Contributions and feedback are welcome. For substantial changes, open an issue to discuss the approach before submitting a pull request. Please keep changes focused and run `bun run verify` before opening a pull request.

## License

This repository currently has no declared license.

## Author

Maintained by [Thalex35](https://github.com/Thalex35).
