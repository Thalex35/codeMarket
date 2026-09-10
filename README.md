# Code Discovery Hub

CODEMARKET — MVP BUILD SPECIFICATION

1. PROJECT OVERVIEW

Build a complete, production-quality MVP web application called CodeMarket.

CodeMarket is a software discovery and distribution platform. The initial version is a personal software catalog where the platform owner is the only person who can publish software.

The long-term vision is much bigger: CodeMarket will eventually become a multi-vendor software marketplace where other developers can publish and sell software, users can purchase software through online payments, and eventually users can post software-development jobs/requests.

However, DO NOT build those future features now.

For this implementation, build ONLY the MVP described in this document.

The architecture should be clean and extensible so that future features can be added without rebuilding the application.

2. MVP SCOPE

The MVP has exactly TWO roles:

admin

user

There is only ONE admin: the platform owner.

For now:

Only the admin can create and publish software.

Normal users cannot upload software.

There are no developer accounts.

There is no developer dashboard.

There is no job marketplace.

There is no automatic online payment system.

There is no Stripe/Visa/Mastercard integration.

Paid software uses a WhatsApp-based purchase flow.

Users can browse the platform without an account.

Users must create an account/login before downloading, liking, or purchasing software.

Do not implement future marketplace functionality unless it is explicitly required by this MVP specification.

3. BRANDING

The application name is:

CodeMarket

Suggested tagline:

Discover. Download. Build.

Use the CodeMarket logo/branding provided in the project.

The visual identity should feel:

Modern

Professional

Clean

Technical

Trustworthy

Software-focused

Marketplace-ready

Avoid making the design look like a generic admin template.

The public website should feel like a real software platform.

The admin interface should feel like a modern SaaS dashboard.

Use:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide icons

Use responsive design throughout.

The application must work properly on:

Desktop

Tablet

Mobile

4. IMPORTANT ARCHITECTURE REQUIREMENT

Even though only the admin can publish software in the MVP, design the database so that software has an owner/publisher relationship.

For example:

software.owner_id

This is important because later CodeMarket will support developers publishing their own software.

Do NOT hardcode the assumption that every software product belongs directly to the admin.

However, in the MVP, enforce permissions so that only the admin can create/edit/publish software.

Future developer functionality should NOT be exposed in the current UI.

5. PUBLIC WEBSITE

Anonymous visitors should be able to use the public website without creating an account.

Public navigation:

Home

Software

About

Contact

Login

Get Started

The public website should NOT look like an admin dashboard.

6. HOME PAGE

Create a polished landing page.

Hero section

Display a strong headline such as:

Discover software built to make work easier.

Supporting text:

Explore practical applications designed to solve real-world problems and make everyday work simpler.

Primary CTA:

Explore Software

Secondary CTA:

About CodeMarket

Include the CodeMarket branding/logo.

Featured software

Display software marked as featured by the admin.

Each software card should show:

Cover image

Software name

Short description

Category

Platform

Free/Paid badge

Price if paid

Like count

Download count

View Software button

Categories

Display categories such as:

Education

Business

Productivity

Healthcare

Church

Entertainment

Other

These should eventually be database-driven rather than hardcoded wherever practical.

Popular software

Display software sorted by download count.

Recently added

Display recently published software.

Why CodeMarket?

Include a short section explaining the platform:

Practical software

Easy discovery

Simple downloads

Regular updates

Software built to solve real problems

Call to action

Encourage visitors to explore the software catalog or create an account.

7. SOFTWARE CATALOG

Route:

/software

Create a professional software catalog.

Include:

Search

Search by:

Software name

Description

Category

Filters

Category

Platform

Free/Paid

Sorting

Newest

Most downloaded

Most liked

A-Z

Software cards

Each card should contain:

Cover

Name

Short description

Category

Platform

Current version

Free/Paid status

Price when applicable

Likes

Downloads

View button

Use pagination or another efficient loading strategy if necessary.

8. SOFTWARE DETAIL PAGE

Route:

/software/:slug

This page should be detailed and professional.

Display:

Header

Software cover

Software name

Short description

Category

Platform

Current version

Free/Paid status

Price

Like count

Download count

Actions:

Free software

Show:

Download Free

Paid software

Show:

Get This Software — $XX

Like

Show:

Like

If the user is not authenticated and attempts to:

Download

Like

Buy

redirect them to authentication.

After authentication, return them to the software page when possible.

9. SOFTWARE DESCRIPTION

The detail page should contain:

About this software

Full description.

Features

Display a list of features.

Example:

Student management

Class management

Attendance

Reports

Events

Search and filtering

Screenshots

Create a professional screenshot gallery.

Allow multiple screenshots per software.

Requirements

Display:

Platform

Operating system

RAM

Storage

Other requirements

Version

Display:

Current version

Release date

File size

Release notes

Version history

Display previous versions where appropriate.

10. AUTHENTICATION

Use Supabase Authentication.

Implement:

Sign up

Login

Logout

Email verification

Forgot password

Reset password

Registration fields:

Full name

Email

Password

Confirm password

The MVP has only:

user

and

admin

roles.

Do NOT create a developer role yet.

11. AUTHENTICATION BEHAVIOR

Visitors can browse everything publicly.

Authentication is required for:

Downloading software

Liking software

Purchasing/requesting paid software

Viewing personal downloads

Viewing personal likes

Viewing personal purchases

Editing profile

If an anonymous visitor clicks Download:

show a clear authentication prompt:

Create an account or sign in to download this software.

Provide:

Login

Create Account

After successful authentication, return the user to the original software page/action where practical.

12. USER EXPERIENCE

Normal users should continue to experience CodeMarket as a website.

Do NOT create a large admin-style sidebar for normal users.

Users should have access to:

Profile

My Downloads

My Likes

My Purchases

These can be accessible through a profile/account menu in the main website navigation.

13. USER PROFILE

Create:

/profile

Allow users to:

View name

View email

Upload/change avatar

Update name

Update profile information

Manage password through the appropriate authentication flow

Do not allow users to modify their role.

14. MY DOWNLOADS

Create:

/downloads

Display software downloaded by the current user.

For each item:

Software name

Cover

Version downloaded

Download date

Current version

Download again button

Only show that user's downloads.

15. MY LIKES

Create:

/likes

Display software liked by the current user.

Allow users to:

View liked software

Unlike software

Open software details

16. FREE SOFTWARE DOWNLOAD SYSTEM

For free software:

User clicks:

Download

Flow:

Check authentication.

Check that software is published.

Determine the current version.

Verify download permission.

Record the download.

Start the file download.

Update relevant analytics.

Every download should record:

User ID

Software ID

Version ID

Timestamp

Do not expose sensitive storage credentials to the client.

Use secure Supabase storage/access patterns.

17. PAID SOFTWARE — MVP

Do NOT implement automatic payment processing.

Paid software should use WhatsApp.

When the user clicks:

Buy / Get This Software

show the price and explain:

This software is available for purchase. Contact us on WhatsApp to complete your purchase.

Provide a WhatsApp button.

The WhatsApp message should contain useful context such as:

User name

Software name

Price

Version

The admin will manually handle the payment.

18. PURCHASE RECORDS

Even though payment is manual, create a proper purchases table.

Suggested fields:

id

user_id

software_id

amount

currency

status

payment_method

created_at

updated_at

Possible statuses:

pending

paid

cancelled

Payment method for MVP:

whatsapp

The admin must be able to manually change a purchase from pending to paid.

When marked paid, the user receives download access to the paid software.

19. MY PURCHASES

Create:

/purchases

Display:

Software

Price

Purchase date

Status

Payment method

Download/access status

For paid purchases marked as paid, allow the user to download the software.

20. ADMIN EXPERIENCE

THIS IS VERY IMPORTANT.

The admin must NOT receive the normal user interface.

When the admin successfully logs in, redirect them directly to:

/admin/dashboard

The admin application must have a completely separate layout.

Use a persistent sidebar.

21. ADMIN SIDEBAR

Create a professional sidebar containing:

Main

Dashboard

Software

All Software

Add Software

Versions

Activity

Downloads

Likes

Purchases

Users

Users

Communication

Messages

Analytics

Analytics

System

Settings

Bottom

Logout

The sidebar should remain available while navigating the admin application.

On mobile, convert it into a responsive drawer/sidebar.

22. ADMIN DASHBOARD

Route:

/admin/dashboard

Create a professional dashboard.

Top greeting:

Welcome back 👋

Then KPI cards:

Total Users

Total Software

Total Downloads

Total Likes

Total Purchases

Pending Purchases

Unread Messages

Then:

Downloads chart

Show downloads over time.

Allow date filtering such as:

7 days

30 days

90 days

All time

Most downloaded software

Show ranking.

Most liked software

Show ranking.

Recent activity

Examples:

New user registered

Software downloaded

Software liked

Purchase request created

Message received

Use real database data when available.

Use mock/seed data during development so the dashboard does not look empty.

23. ADMIN — SOFTWARE MANAGEMENT

Route:

/admin/software

Display all software.

Include:

Search

Category filter

Status filter

Free/Paid filter

Sorting

Each software row/card should show:

Cover

Name

Category

Version

Price

Downloads

Likes

Status

Updated date

Actions:

View

Edit

Manage Versions

Publish/Unpublish

Archive

Delete where appropriate

24. ADMIN — ADD SOFTWARE

Route:

/admin/software/new

Create a complete software creation form.

Fields:

Basic information

Software name

Slug

Short description

Full description

Category

Platform

Pricing

Options:

Free

or

Paid

If paid:

Price

Currency

Default currency:

USD

Software information

Current version

Release date

Requirements

Features

Release notes

Media

Cover image

Multiple screenshots

Download

Software installer/executable

Publishing

Draft

Published

Featured

Provide:

Save Draft

and

Publish Software

buttons.

Validate all required fields.

25. ADMIN — EDIT SOFTWARE

Route:

/admin/software/:id

Allow the admin to modify all software information.

Do not destroy existing download history or likes when editing.

26. ADMIN — VERSION MANAGEMENT

Route:

/admin/software/:id/versions

Allow the admin to:

Add version

Upload installer

Set version number

Add release notes

Set release date

Set file size

Set current version

View previous versions

Example:

TeacherHer:

v1.3.0 — Current

v1.2.0

v1.1.0

v1.0.0

Downloads should use the current published version unless another authorized version is intentionally selected.

27. ADMIN — DOWNLOADS

Route:

/admin/downloads

Display download records.

Columns:

User

Software

Version

Date

Features:

Search

Filter by software

Filter by date

Filter by version

28. ADMIN — LIKES

Route:

/admin/likes

Display useful like statistics.

Show:

Software

Total likes

Popularity ranking

Optionally allow viewing users who liked each software.

29. ADMIN — PURCHASES

Route:

/admin/purchases

Display all purchase requests.

Columns:

User

Software

Amount

Status

Payment method

Date

Admin actions:

Mark pending

Mark paid

Cancel

View details

When marked paid, the corresponding user must gain access to the paid software.

30. ADMIN — USERS

Route:

/admin/users

Display registered users.

Show:

Name

Email

Registration date

Number of downloads

Number of likes

Number of purchases

Account status

Admin actions:

View user

Disable account

Enable account

Delete account where appropriate

Do NOT allow creation of additional admin accounts through the normal UI.

The MVP should have only one administrator.

31. ADMIN — MESSAGES

Route:

/admin/messages

Contact form submissions should appear here.

Show:

Sender

Email

Subject

Message

Date

Status

Statuses:

Unread

Read

Archived

Admin can open and mark messages as read.

32. CONTACT PAGE

Route:

/contact

Create a professional contact form.

Fields:

Name

Email

Subject

Message

Validate inputs.

Store messages securely in Supabase.

Display appropriate success/error states.

Also provide configured contact information such as:

Email

WhatsApp

Social links

33. ABOUT PAGE

Route:

/about

Create a professional developer/platform story.

Include:

About CodeMarket

About the creator

Mission

What CodeMarket offers

Software/projects

Technologies where appropriate

Contact CTA

The design should feel like a professional developer/product company website rather than a school project.

34. ANALYTICS

Create an analytics event system.

Track events such as:

page_view

software_view

download

like

unlike

signup

login

purchase_request

contact

Analytics should be privacy-conscious.

The admin can use the collected data to understand:

Software views

Downloads

Likes

User registrations

Purchase requests

Popular software

Activity over time

35. DATABASE

Use Supabase PostgreSQL.

Create proper migrations.

Suggested core tables:

profiles

id

full_name

email

avatar_url

role

created_at

updated_at

Roles:

user

admin

software

id

owner_id

name

slug

short_description

description

category

platform

pricing_type

price

currency

featured

published

archived

created_at

updated_at

software_screenshots

id

software_id

image_url

caption

sort_order

created_at

software_versions

id

software_id

version

file_url

file_size

release_notes

release_date

minimum_os

is_current

created_at

likes

id

user_id

software_id

created_at

Enforce uniqueness for:

user_id + software_id

so a user cannot like the same software twice.

downloads

id

user_id

software_id

version_id

downloaded_at

purchases

id

user_id

software_id

amount

currency

status

payment_method

created_at

updated_at

messages

id

user_id nullable

name

email

subject

message

status

created_at

analytics_events

id

user_id nullable

event_type

software_id nullable

metadata

created_at

site_settings

id

key

value

updated_at

36. DATABASE SECURITY

Implement proper Supabase Row Level Security.

This is mandatory.

Users must only be able to access their own private information.

For example:

A user can:

Read/update their own profile.

Read their own downloads.

Read their own purchases.

Create/delete their own likes.

A user must NOT be able to:

Modify another user's profile.

View another user's private purchase information.

Modify downloads.

Upload software.

Modify software.

Modify site settings.

Access admin functionality.

Only the admin can manage the platform.

Do not rely only on frontend route protection.

The database/security layer must enforce permissions.

37. STORAGE

Create appropriate Supabase storage buckets.

Suggested:

covers

screenshots

software-files

avatars

Storage policies must prevent unauthorized uploads.

In the MVP:

Admin can upload software files.

Admin can upload covers.

Admin can upload screenshots.

Users can manage their own avatar.

Users cannot upload arbitrary software.

Protect executable/software files appropriately.

Do not expose service-role keys in frontend code.

38. MOCK DATA

Seed the application with realistic mock data so the platform does not look empty.

Use examples inspired by the kinds of applications the creator builds, such as:

TeacherHer

Student and classroom management.

Children Management

Church children's management.

TaskMe

Task/productivity management.

Dentary Clinic Management

Dental clinic/patient management.

Add several additional realistic mock software entries if needed.

For each mock software, include:

Name

Description

Category

Price/free status

Version

Features

Requirements

Mock download count

Mock likes

Screenshots/placeholder visual assets where appropriate

Do NOT use fake external download URLs.

Use safe placeholder/mock files or clearly mark mock download assets during development.

39. EMPTY STATES

Every important page needs a useful empty state.

Examples:

No software:

No software available yet.

No downloads:

You haven't downloaded any software yet. Explore CodeMarket to get started.

No likes:

You haven't liked any software yet.

No messages:

No messages yet.

No purchases:

You don't have any purchases yet.

40. LOADING STATES

Use professional loading states.

Use:

Skeleton loaders

Spinners where appropriate

Disabled buttons during submissions

Upload progress indicators

Do not leave blank screens while data is loading.

41. ERROR HANDLING

Implement clear errors for:

Failed login

Invalid registration

Failed upload

Invalid file

Failed download

Failed database operation

Unauthorized access

Missing software

Network errors

Do not expose raw database errors to normal users.

42. SECURITY REQUIREMENTS

Pay particular attention to:

Authentication

Authorization

RLS

Storage policies

Admin protection

File upload validation

File size validation

Input validation

XSS protection

Secure database queries

Protected downloads

No service-role credentials in frontend

No hardcoded admin bypass

No hardcoded user passwords

No secret keys committed to GitHub

The admin role must be determined from trusted database/auth data.

43. SEO

Implement basic SEO.

Each software page should have dynamic:

Title

Description

Open Graph metadata where practical

Use SEO-friendly URLs:

/software/teacherher

rather than:

/software?id=123

Create:

Good page titles

Meta descriptions

Proper headings

Accessible image alt text

44. RESPONSIVE DESIGN

The public site must be excellent on mobile.

The admin dashboard must also be usable on mobile.

Desktop:

Persistent sidebar.

Mobile:

Collapsible sidebar/drawer.

Tables should become responsive cards or horizontally scroll when appropriate.

45. UI/UX QUALITY

The application should feel polished.

Use:

Consistent spacing

Clear hierarchy

Good typography

Professional cards

Subtle borders/shadows

Clear CTA buttons

Good empty states

Toast notifications

Confirmation dialogs for destructive actions

Avoid:

Excessive animations

Clutter

Huge text everywhere

Generic template appearance

Inconsistent buttons

Poor mobile layouts

46. FUTURE-READY ARCHITECTURE

IMPORTANT:

Do not implement these features now:

Developer accounts

Developer dashboard

Third-party publishing

Developer payouts

Automatic payment provider

Job marketplace

Proposals

Messaging between buyers and developers

Platform commissions

Automatic software updates

Advanced licensing

However, structure the data model so they can be introduced later.

The software.owner_id relationship is particularly important.

Do not create architecture that assumes the admin will always be the only publisher.

47. FUTURE CODEMARKET VISION

For context only, the eventual platform will support:

Users

Discover software

Download

Purchase

Like

Review

Maintain software library

Developers

Create developer profile

Publish software

Manage versions

Sell software

View downloads

View sales

View revenue

Admin

Approve developers

Approve software

Moderate content

Manage users

Manage payments

Manage platform revenue

Manage disputes

Analytics

Future Jobs Marketplace

Users can eventually post:

Software requests

Development jobs

Requirements

Budget

Deadline

Developers can:

View jobs

Submit proposals

Communicate

Get hired

Complete projects

Receive reviews

Again: NONE of these future features should be implemented in this MVP.

48. MVP ADMIN ROUTES

Implement:

/admin/dashboard

/admin/software

/admin/software/new

/admin/software/:id

/admin/software/:id/versions

/admin/downloads

/admin/likes

/admin/purchases

/admin/users

/admin/messages

/admin/analytics

/admin/settings

All admin routes must be protected.

49. MVP PUBLIC/USER ROUTES

Implement:

/

/software

/software/:slug

/about

/contact

/auth

/profile

/downloads

/likes

/purchases

Admin routes must never be accessible to normal users.

50. ADMIN LOGIN BEHAVIOR

This is mandatory.

If an authenticated user has:

role = admin

redirect them directly to:

/admin/dashboard

Do NOT show the normal user dashboard to the admin.

The admin should immediately see the admin sidebar and dashboard.

If a normal user logs in:

redirect them to the public website or the page they were attempting to access.

51. SETTINGS

Admin settings should allow configuration of:

CodeMarket name

Logo

Contact email

WhatsApp number

Social links

Currency

Site description

The WhatsApp number must be configurable because paid software uses WhatsApp in the MVP.

52. FINAL MVP ACCEPTANCE CRITERIA

The MVP is considered complete only when ALL of the following work:

Anonymous visitors can browse CodeMarket.

Visitors can search and filter software.

Visitors can open detailed software pages.

Visitors can see screenshots and software information.

Visitors cannot download software without authentication.

Visitors cannot like software without authentication.

Visitors cannot purchase/request paid software without authentication.

Users can register and log in.

Users can like/unlike software.

Users can download free software.

Downloads are recorded.

Users can see their download history.

Users can see their likes.

Users can see purchases.

Paid software uses WhatsApp for the MVP.

Admin can manually mark purchases as paid.

Paid users receive download access after payment confirmation.

Admin login goes directly to /admin/dashboard.

Admin sees a dedicated sidebar-based dashboard.

Admin can create software.

Admin can edit software.

Admin can publish/unpublish software.

Admin can feature software.

Admin can upload covers.

Admin can upload screenshots.

Admin can upload software files.

Admin can manage software versions.

Admin can view downloads.

Admin can view likes.

Admin can manage purchases.

Admin can view users.

Admin can manage contact messages.

Admin can see analytics.

Admin can configure settings.

Supabase RLS protects user data.

Storage permissions are secure.

Admin routes are protected.

The UI is responsive.

Loading and error states exist.

Mock data makes the application usable for demonstration.

No future developer marketplace/job/payment features are exposed.

The codebase is organized so future CodeMarket phases can be added cleanly.

53. DEVELOPMENT APPROACH

Do not try to generate everything blindly in one pass if that risks creating broken functionality.

Work systematically.

Recommended implementation order:

Project structure and design system.

Supabase configuration.

Database schema and migrations.

Authentication and roles.

Public website.

Software catalog.

Software detail pages.

User likes/downloads.

User profile/library.

Admin layout and sidebar.

Admin software management.

Storage uploads.

Version management.

WhatsApp purchase flow.

Purchase management.

Analytics.

Messages.

Settings.

Security/RLS audit.

Responsive/mobile audit.

Final testing.

After each major stage, verify that existing functionality still works.

Do not replace working functionality with mock implementations.

Do not create fake authentication.

Do not create fake admin authorization.

Use the real Supabase backend.

54. IMPORTANT FINAL INSTRUCTION

Build this as a real MVP, not merely a visual prototype.

The buttons and flows must actually work.

The database must actually work.

Authentication must actually work.

RLS must actually work.

Uploads must actually work.

Downloads must actually work.

Likes must actually work.

Purchase records must actually work.

Admin authorization must actually work.

Analytics should use real data.

Use mock/seed data only to populate the initial catalog and demonstrate the application.

Keep the implementation clean, maintainable, and ready for future CodeMarket marketplace phases.

Start by inspecting the existing project structure and configuration. Do not unnecessarily replace an existing working setup. Then implement the MVP systematically according to this specification.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b23c131-706f-4674-84f2-50eb1fa09760).

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
