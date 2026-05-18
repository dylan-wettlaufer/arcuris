"""User and system prompts for resume generation (authoritative copy)."""

import json
from typing import Any

from schemas import BulletRewrite, ParsedResume, ResumeEvaluation


def _compact_json(data: Any) -> str:
    return json.dumps(data, separators=(",", ":"))


def build_draft_resume_prompt(
    *,
    parsed_resume: ParsedResume,
    interview_answers: dict[str, str],
    job_description: str,
) -> str:
    return f"""Generate a tailored resume for this new grad software engineering job application.

Return only JSON with this exact shape:
{{
  "companyName": "company extracted from the job description, or Unknown Company",
  "roleTitle": "role title extracted from the job description, or Software Engineer",
  "resumeMarkdown": "ATS-safe one-page resume in markdown",
  "resumeJson": {{
    "contact": {{
      "name": "candidate name",
      "email": "candidate email or null",
      "phone": "candidate phone or null",
      "linkedin": "candidate LinkedIn or null",
      "github": "candidate GitHub or null",
      "location": "candidate location or null"
    }},
    "summary": "2-3 line tailored summary",
    "education": [
      {{
        "institution": "school name",
        "degree": "degree or null",
        "location": "location or null",
        "dates": "date range or null",
        "details": ["optional concise detail"]
      }}
    ],
    "experience": [
      {{
        "company": "company name",
        "role": "role title",
        "location": "location or null",
        "dates": "date range or null",
        "bullets": ["tailored bullet"]
      }}
    ],
    "projects": [
      {{
        "name": "project name",
        "techStack": ["technology"],
        "dates": "date range or null",
        "bullets": ["tailored bullet"]
      }}
    ],
    "skills": [
      {{
        "category": "Languages",
        "items": ["Python"]
      }}
    ]
  }},
  "bulletRewrites": [
    {{
      "source": "experience or project label",
      "originalBullet": "original source bullet",
      "rewrittenBullet": "draft rewritten bullet that appears in resumeMarkdown"
    }}
  ]
}}

Resume requirements:
- Use only facts supported by the parsed resume and interview answers.
- Interview answers use `exp_<n>_impact`, `exp_<n>_day_to_day`, `exp_<n>_technologies`, and `exp_<n>_beyond_resume` for entries in `parsed_resume.experience` at index `n` that were flagged technical (non-technical lines like club leadership are skipped). If every line was non-technical, keys are `general_context_impact`, `general_context_day_to_day`, `general_context_technologies`, and `general_context_beyond_resume`—use those as one free-form technical story.
- Prioritize JD alignment in the bullets you choose to rewrite, not by removing experience or project rows.
- **Do not JD-tailor every bullet.** For experience and project bullets that are **not** a strong fit for this job description, keep the wording **essentially the same** as the parsed resume (light grammar or tense fixes only—no keyword stuffing or JD reshaping).
- **JD-tailor only bullets** where rephrasing clearly improves fit to the posting (skills, domain, responsibilities, or outcomes the JD cares about). Skip bullets that are off-topic for this role or already sufficient.
- bulletRewrites must list **only** those JD-tailored bullets: one entry per bullet you materially rewrote for this job, **up to 12 items**, **at least 1 item** whenever at least one bullet benefits from JD alignment (otherwise include the single best candidate for alignment).
- Each rewrittenBullet must be a real bullet that appears in resumeMarkdown and must match the corresponding originalBullet before tailoring.
- Each rewrittenBullet should materially differ from the originalBullet by using stronger ATS-aligned language **when the source supports it** and the JD makes that angle relevant.
- CRITICAL: The entire resume MUST fit on one page.
- Each bullet should stay about one printed line (prefer under ~160 characters; avoid long wraps).
- If the resume would exceed one page, shorten bullet wording and/or remove **individual** bullets starting with the least JD-relevant; **never** remove an entire experience or project row.
- **Date ranges:** In resumeJson (and markdown), every `dates` field that spans start and end must use a **separator**: an en dash with spaces, e.g. `September 2022 – April 2026`, `Jan 2022 – Present`, or `2020 – 2024`. Never output two month/year chunks back-to-back without ` – ` between them.
- resumeJson must contain the same resume content as resumeMarkdown, but structured for LaTeX rendering.
- Keep section ordering suitable for a Jake's Resume style layout: contact, summary, education, experience, projects, skills.
- **Skills categories:** `resumeJson.skills` must mirror **parsed_resume.skillGroups**: same number of rows, same `category` strings in the same order. Edit **items** inside each category only (JD-align wording, dedupe, trim)—do **not** add category rows, remove rows, rename categories, merge two parsed categories, or split one parsed category into two. Every category must output **at least one** item (generated schema); if a parsed category lists zero items, populate it with truthful skills drawn from the rest of the parsed resume before responding. If `parsed_resume.skillGroups` is empty, use at most four sensible software-focused labels (for example Languages, Frameworks, Tools).
- **Experience and projects (structure):** `resumeJson.experience` must include **every** entry in `parsed_resume.experience` in the **same order**; keep `company`, `role`, `location`, and `dates` aligned with each parsed row. `resumeJson.projects` must include **every** entry in `parsed_resume.projects` in the **same order**; keep `name`, `techStack`, and `dates` aligned with each parsed row. Do **not** omit, merge, or add experience/project rows for JD fit. Selective JD tailoring belongs in `bulletRewrites` only.
- Use simple markdown headings and bullets. Do not include commentary outside JSON.

Parsed resume:
{_compact_json(parsed_resume.model_dump(mode="json", by_alias=True))}

Interview answers:
{_compact_json(interview_answers)}

Job description:
{job_description}"""


def build_evaluate_resume_prompt(
    *,
    draft_resume_markdown: str,
    draft_bullet_rewrites: list[BulletRewrite],
    job_description: str,
) -> str:
    bullets_payload = [b.model_dump(by_alias=True) for b in draft_bullet_rewrites]
    return f"""Evaluate only these draft rewritten resume bullets against their original source bullets and the job description.
The model chose these bullets as the subset that warranted JD-specific tailoring—not every bullet on the resume.

Return only JSON with this exact shape:
{{
  "draftScore": 1,
  "keywordAlignment": 1,
  "impactClarity": 1,
  "atsFriendliness": 1,
  "narrativeFit": 1,
  "improvements": [
    "specific improvement 1",
    "specific improvement 2",
    "specific improvement 3",
    "specific improvement 4",
    "specific improvement 5"
  ]
}}

CRITICAL — improvements array:
- improvements must be a JSON array of **exactly five** strings: **not 4, not 6, not any other count — always 5.**
- Each string is one standalone improvement line (no nested lists or numbered sub-items inside one string).
- If you have more than five ideas, keep only the five highest-impact edits and drop the rest. If you have fewer than five, split one broad issue into two concrete bullet-level fixes until you have five (still truthful to the source bullets).
- Do **not** append an extra sixth improvement; downstream validation rejects any length other than 5.

Scoring rules:
- Every score must be an integer from 1 to 10.
- draftScore is the overall quality of the rewritten bullets, not the whole resume.
- Evaluate how well the rewritten bullets preserve the original facts while using language that matches the job description.
- Reward ATS-aligned phrasing when it truthfully maps to the original bullets.
- Do not penalize the resume for missing technologies, tools, credentials, or experiences that are absent from the original bullets.
- Penalize invented claims, inflated scope, vague rewrites, weak action verbs, missing metrics that were present in the originals, and missed opportunities to mirror JD language.
- Penalize bullets that sprawl past roughly one line or ~160 characters — brevity still matters for ATS and readability.
- Improvements must be concrete bullet-level edits that can be applied in the next pass.
- **Again:** improvements.length must equal **5** in the JSON output — double-check before responding.

Draft bullet rewrites to evaluate:
{_compact_json(bullets_payload)}

Full draft resume context:
{draft_resume_markdown}

Job description:
{job_description}"""


def build_refine_resume_prompt(
    *,
    draft_resume_markdown: str,
    draft_bullet_rewrites: list[BulletRewrite],
    evaluation: ResumeEvaluation,
    interview_answers: dict[str, str],
    job_description: str,
) -> str:
    bullets_payload = [b.model_dump(by_alias=True) for b in draft_bullet_rewrites]
    return f"""Apply every bullet-level improvement from the evaluation to produce the final tailored resume.
Use the interview answers for extra factual context when refining wording (do not invent facts).
Keys are `exp_<n>_*` for technical `experience` rows at index `n`, or `general_context_*` when no row was technical—map answers to the matching job bullets when possible.

Return only JSON with this exact shape:
{{
  "refinedScore": 1,
  "resumeMarkdown": "final ATS-safe one-page resume in markdown",
  "resumeJson": {{
    "contact": {{
      "name": "candidate name",
      "email": "candidate email or null",
      "phone": "candidate phone or null",
      "linkedin": "candidate LinkedIn or null",
      "github": "candidate GitHub or null",
      "location": "candidate location or null"
    }},
    "summary": "2-3 line tailored summary",
    "education": [
      {{
        "institution": "school name",
        "degree": "degree or null",
        "location": "location or null",
        "dates": "date range or null",
        "details": ["optional concise detail"]
      }}
    ],
    "experience": [
      {{
        "company": "company name",
        "role": "role title",
        "location": "location or null",
        "dates": "date range or null",
        "bullets": ["tailored bullet"]
      }}
    ],
    "projects": [
      {{
        "name": "project name",
        "techStack": ["technology"],
        "dates": "date range or null",
        "bullets": ["tailored bullet"]
      }}
    ],
    "skills": [
      {{
        "category": "Languages",
        "items": ["Python"]
      }}
    ]
  }},
  "bulletFeedback": [
    {{
      "source": "experience or project label",
      "originalBullet": "original source bullet",
      "draftBullet": "draft rewritten bullet from the previous pass",
      "rewrittenBullet": "final rewritten bullet",
      "feedback": "what changed during refinement and why it improves ATS alignment"
    }}
  ]
}}

Rules:
- refinedScore must be an integer from 1 to 10 after improvements are applied.
- bulletFeedback must include **exactly one row per entry** in draftBulletRewrites (the JD-tailored subset from the draft). Do not add feedback rows for bullets that were never in that list.
- Each bulletFeedback item must compare one original source bullet to the final rewritten bullet for bullets you refined; draftBullet must exactly match the previous draft rewritten bullet for that item.
- rewrittenBullet must be the final bullet text and must appear in resumeMarkdown.
- **Leave all other resume bullets** (not in draftBulletRewrites) **unchanged** from the draft wording except tiny grammar fixes if needed—do not expand JD tailoring to bullets the draft already left generic.
- When source facts allow it, rewrittenBullet should materially differ from draftBullet by applying the evaluation improvements.
- The feedback must explain the refinement-stage change: JD language matched, stronger verb, clearer metric, tighter scope, or truthfulness correction.
- Keep every rewritten bullet truthful to the original source bullets, parsed resume, and interview answers.
- Improve ATS alignment by matching the job description's language where the source bullets and interview answers support it.
- Do not add technologies, tools, metrics, credentials, or responsibilities that are not supported by the source material.
- Preserve an ATS-safe structure: contact, summary, education, experience, projects, skills.
- **Skills categories:** Keep **resumeJson.skills** aligned with the draft resumeJson.skills: same rows with identical `category` strings and order; refine **items** inside those categories only.
- resumeJson must contain the same final resume content as resumeMarkdown, but structured for LaTeX rendering.
- CRITICAL: The entire resume MUST fit on one page.
- Each bullet should stay about one printed line (prefer under ~160 characters; avoid long wraps).
- If the resume would exceed one page, shorten bullet wording and/or remove **individual** bullets starting with the least JD-relevant; **never** remove an entire experience or project row.
- **Date ranges:** In resumeJson (and markdown), every `dates` field that spans start and end must use a **separator**: an en dash with spaces, e.g. `September 2022 – April 2026`, `Jan 2022 – Present`, or `2020 – 2024`. Never output two month/year chunks back-to-back without ` – ` between them.
- **Experience and projects (structure):** Keep **every** `parsed_resume.experience` and `parsed_resume.projects` row in the same order with the same company/role/name and dates as inventory. Refine only bullets in `bulletFeedback`; other bullets stay as in the draft unless trimmed for one page (individual bullets only, never whole rows).
- Prefer strong relevant bullets over keyword stuffing.
- Do not include commentary outside JSON.

Draft bullet rewrites (JD-tailored subset only):
{_compact_json(bullets_payload)}

Draft resume:
{draft_resume_markdown}

Evaluation and required improvements:
{_compact_json(evaluation.model_dump(by_alias=True))}

Interview answers:
{_compact_json(interview_answers)}

Job description:
{job_description}"""
