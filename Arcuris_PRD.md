# Arcuris — Product Requirements Document
**Version:** 1.0 (MVP)
**Last Updated:** May 2026
**Status:** In Development

---

## 1. Overview

### 1.1 Product Summary

Arcuris is a web application that helps new grad job seekers generate tailored resumes for specific roles and track their job applications in one place. The name reflects the product's two core mechanics — it archives the user's full experience inventory, then curates it down to what each specific role needs. Users upload their existing resume, answer a short interview to surface context the resume misses, then paste any job description to receive an AI-refined resume in under two minutes. Every generation automatically logs an application record, turning the tool into a passive application tracker that requires no manual input.

### 1.2 Problem Statement

New grad job seekers face two compounding problems. First, a generic resume performs poorly against ATS systems and role-specific hiring bars — tailoring takes time most candidates don't invest. Second, tracking applications across spreadsheets and Notion docs is tedious and gets abandoned quickly.

Existing resume tools either produce generic output with no understanding of the user's actual experience depth, or require manual rewriting with no AI assistance. Existing trackers require users to log every application by hand, so they go stale.

### 1.3 Solution

Arcuris solves both problems with a single workflow. The resume generation step is the data entry point for the tracker — users never fill in a form. The AI interview step surfaces context that resumes miss, producing output that is meaningfully stronger than a JD-to-resume keyword match.

### 1.4 Target User

New grad software engineers actively applying to roles. Primarily 2025–2026 graduates navigating a competitive market where application volume is high and differentiation is difficult.

---

## 2. Goals

### 2.1 MVP Goals

- Allow a user to generate a tailored, ATS-ready resume for any role in under two minutes
- Surface richer experience context through a structured AI interview that runs once at onboarding
- Automatically log every generation as an application record with zero manual input
- Let users track application status across all roles from a single dashboard
- Store all user data securely with row-level isolation

### 2.2 Success Metrics

| Metric | Target |
|---|---|
| Time from JD paste to PDF download | < 2 minutes |
| Resume quality score improvement (draft → refined) | ≥ 1.5 points on 10-point scale |
| User retention (returns to generate a second resume) | > 60% |
| Application records created per active user per week | ≥ 3 |

### 2.3 Out of Scope for MVP

- Multiple resume inventories per user
- Resume diffing across applications
- Analytics and response rate tracking
- OAuth / social login
- Team features or resume sharing
- Mobile-native experience
- Browser extension for auto-detecting job postings

---

## 3. User Stories

### 3.1 Onboarding

**US-01 — Sign Up**
As a new user, I want to create an account with my email and password so that my data is saved between sessions.

**US-02 — Upload Resume**
As a new user, I want to upload or paste my existing resume so that the system has my baseline experience to work from.

**US-03 — Resume Parsing**
As a new user, I want the system to automatically parse my resume into structured data so that I don't have to manually enter my experience.

**US-04 — AI Interview**
As a new user, I want to answer a short set of follow-up questions generated from my resume so that the AI has richer context — metrics, ownership, technical depth — that my resume doesn't capture.

**US-05 — Inventory Saved**
As a returning user, I want my parsed resume and interview answers to be saved so that I don't repeat onboarding every session.

### 3.2 Resume Generation

**US-06 — Paste Job Description**
As a user, I want to paste a job description and have the system generate a tailored resume so that my application is aligned to each specific role.

**US-07 — Generation Loop**
As a user, I want the system to generate a first draft, evaluate it, and refine it automatically so that I receive the strongest possible output without manual iteration.

**US-08 — Score Transparency**
As a user, I want to see the before and after quality scores and the list of improvements applied so that I understand why the refined version is stronger.

**US-09 — PDF Download**
As a user, I want to download the final resume as a clean, formatted PDF so that I can attach it to applications immediately.

### 3.3 Application Tracker

**US-10 — Auto-Logging**
As a user, I want every resume I generate to automatically create an application record so that I never have to manually log that I applied somewhere.

**US-11 — Application Dashboard**
As a user, I want to see all my applications in one view with company, role, date, and current status so that I can see where I stand across my search.

**US-12 — Status Updates**
As a user, I want to update the status of each application (Applied, Phone Screen, Interview, Offer, Rejected) so that my tracker reflects reality as it changes.

**US-13 — View Sent Resume**
As a user, I want to click into any application and see the exact resume version I generated for that role so that I know what I submitted before a phone screen.

### 3.4 Auth

**US-14 — Log In**
As a returning user, I want to log in and have my inventory and applications waiting for me so that I can continue where I left off.

**US-15 — Log Out**
As a user, I want to log out so that my data is not accessible on shared devices.

---

## 4. Functional Requirements

### 4.1 Authentication

- Email and password sign up and log in via Supabase Auth
- Authenticated session persists across browser sessions
- All routes except `/login` and `/signup` require authentication
- Log out clears session and redirects to `/login`

### 4.2 Resume Inventory

- User can upload a pdf file
- On submission, resume text is sent to Gemini API via Next.js API route for structured JSON extraction
- Extracted fields: name, email, phone, linkedin, github, summary, education, experience (with bullets), projects (with tech stack and bullets), skills
- After parsing, Gemini generates 6 targeted follow-up questions based on gaps in the resume
- User answers are stored alongside the parsed JSON as `additionalContext`
- Inventory is saved to Supabase under the authenticated user's ID
- User can return to edit inventory at any time from settings
- If inventory already exists on login, onboarding is skipped

### 4.3 Resume Generation

- User pastes full job description text
- System runs a three-pass Gemini API loop:
  - **Pass 1:** Generate a tailored resume bullets from expereinces using inventory + JD
  - **Pass 2:** Evaluate draft and return scores (keyword alignment, impact clarity, ATS friendliness, narrative fit) plus top 5 specific improvements
  - **Pass 3:** Apply all improvements and generate refined resume
- Both draft and refined resume scores are displayed to the user
- Final resume is rendered in a live preview panel
- User can download the final resume as a PDF via browser print dialog
- Generation takes under 2 minutes end to end

### 4.4 Application Tracker

- On every successful generation, an application record is automatically created with:
  - `company_name` — extracted from JD by Gemini or entered by user
  - `role_title` — extracted from JD by Gemini or entered by user
  - `job_description` — full JD text
  - `resume_markdown` — final refined resume text
  - `draft_score` — numeric score from Pass 2
  - `refined_score` — numeric score after Pass 3
  - `status` — defaults to "Applied"
  - `created_at` — timestamp
  - `user_id` — foreign key to auth user
- Dashboard displays all applications in reverse chronological order
- Each row shows: company, role, date, status badge
- Status can be updated inline from the dashboard
- Clicking any row opens a detail view showing the full resume that was generated
- No applications can be manually created — they only originate from generation

### 4.5 PDF Export

- PDF is generated client-side via a styled print window
- Layout is clean, single-column, ATS-safe
- Typography uses Garamond for headings and DM Sans for body
- Output fits on one page

---

## 5. Data Model

### 5.1 Tables

**`inventory`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| resume_text | text | Raw uploaded text |
| parsed_json | jsonb | Structured resume data |
| interview_answers | jsonb | Question/answer pairs |
| created_at | timestamptz | |
| updated_at | timestamptz | |

One row per user. Upsert on update.

**`applications`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → auth.users |
| company_name | text | |
| role_title | text | |
| job_description | text | Full JD text |
| resume_markdown | text | Final refined resume |
| draft_score | integer | 1–10 |
| refined_score | integer | 1–10 |
| status | text | Applied, Phone Screen, Interview, Offer, Rejected |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 5.2 Row-Level Security

All tables enforce RLS. Every policy uses `auth.uid() = user_id` so users can only read and write their own rows. No exceptions.

```sql
-- Example policy
create policy "Users can only access their own inventory"
on inventory for all
using (auth.uid() = user_id);
```

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Next.js API Routes |
| Auth + Database | Supabase |
| AI | Google Gemini API |
| PDF Export | Browser print API |
| Hosting | Vercel |

### 6.2 AI Integration

- All Gemini calls are made server-side via Next.js API routes — API key is never exposed to the client
- Three sequential calls per generation: draft → evaluate → refine
- Prompts are versioned in a `/lib/prompts` constants file for easy iteration
- Next.js API routes handle request validation, error handling, and response streaming where applicable

### 6.3 Key Constraints

- Gemini API key is stored as a server-side environment variable in Vercel — never shipped to the client
- Supabase client SDK used on the frontend for auth session management and data fetching
- All AI calls proxied through `/api` routes to keep credentials secure
- PDF generation is client-side only — no server rendering required

---

## 7. User Flow

```
Sign Up / Log In
      ↓
Inventory exists? ──Yes──→ Dashboard
      ↓ No
Upload Resume
      ↓
Gemini parses → structured JSON (via Next.js API route)
      ↓
AI Interview (6 questions)
      ↓
Inventory saved to Supabase
      ↓
Dashboard
      ↓
Paste Job Description
      ↓
Generate → Evaluate → Refine (3 Gemini passes via Next.js API route)
      ↓
Preview + Score comparison
      ↓
Download PDF
      ↓
Application auto-logged → appears in dashboard
      ↓
User updates status as search progresses
```

---

## 8. UI Screens

| Screen | Route | Description |
|---|---|---|
| Login | `/login` | Email + password form |
| Sign Up | `/signup` | Email + password form |
| Onboarding — Upload | `/onboarding/upload` | Resume upload or paste |
| Onboarding — Interview | `/onboarding/interview` | 6 AI-generated questions |
| Dashboard | `/dashboard` | Application tracker table |
| Generate | `/generate` | JD input + generation flow |
| Result | `/generate/result` | Resume preview + score panel + download |
| Application Detail | `/applications/:id` | Full resume + JD for a logged application |
| Settings | `/settings` | Edit inventory |

---

## 9. Non-Functional Requirements

- **Performance:** Generation completes in under 2 minutes on a standard connection
- **Security:** RLS enforced on all tables. No user can access another user's data.
- **Reliability:** Graceful error handling on all Gemini API calls with user-facing messages
- **Accessibility:** Semantic HTML, keyboard navigable, sufficient color contrast
- **Responsiveness:** Functional on desktop browsers. Mobile is secondary for MVP.

---

## 10. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | Should company name and role title be extracted automatically from the JD by Gemini, or should users confirm before saving? | Product | High |
| 2 | What happens if Gemini fails mid-generation — should partial results be saved? | Engineering | High |
| 3 | Should the inventory interview run once at onboarding only, or should users be able to re-run it after updating their resume? | Product | Medium |
| 4 | Is one page a hard constraint for the PDF output, or should long inventories be allowed to flow to two pages? | Product | Medium |
| 5 | Which Gemini model to use — gemini-1.5-pro for quality vs gemini-1.5-flash for speed and cost? | Engineering | High |

---

## 11. Milestones

| Milestone | Deliverable | Target |
|---|---|---|
| M1 | Auth + Supabase schema + RLS | Week 1 |
| M2 | Onboarding flow (upload + parse + interview) | Week 2 |
| M3 | Generation loop + PDF download | Week 3 |
| M4 | Application tracker dashboard + detail view | Week 4 |
| M5 | Deployed to Vercel with live URL | Week 5 |
| M6 | Bug fixes + README + demo video | Week 6 |
