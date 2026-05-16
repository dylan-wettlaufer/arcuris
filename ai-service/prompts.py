"""Mirrors lib/prompts/resume-generation.ts — keep in sync when prompts change."""

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
- Emphasize the experiences, projects, skills, and impact most relevant to the job description.
- Rewrite bullets to be specific, metric-aware, and action-oriented.
- bulletRewrites must include the important rewritten experience/project bullets used in resumeMarkdown, up to 12 items.
- Each rewrittenBullet must be a real bullet that appears in resumeMarkdown.
- Each rewrittenBullet should materially differ from the originalBullet by using stronger ATS-aligned language when the source supports it.
- Keep the resume concise enough for one page.
- resumeJson must contain the same resume content as resumeMarkdown, but structured for LaTeX rendering.
- Keep section ordering suitable for a Jake's Resume style layout: contact, summary, education, experience, projects, skills.
- Use simple markdown headings and bullets. Do not include commentary outside JSON.

Parsed resume:
{_compact_json(parsed_resume.model_dump())}

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

Scoring rules:
- Every score must be an integer from 1 to 10.
- draftScore is the overall quality of the rewritten bullets, not the whole resume.
- Evaluate how well the rewritten bullets preserve the original facts while using language that matches the job description.
- Reward ATS-aligned phrasing when it truthfully maps to the original bullets.
- Do not penalize the resume for missing technologies, tools, credentials, or experiences that are absent from the original bullets.
- Penalize invented claims, inflated scope, vague rewrites, weak action verbs, missing metrics that were present in the originals, and missed opportunities to mirror JD language.
- Improvements must be concrete bullet-level edits that can be applied in the next pass.

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
    job_description: str,
) -> str:
    bullets_payload = [b.model_dump(by_alias=True) for b in draft_bullet_rewrites]
    return f"""Apply every bullet-level improvement to produce the final tailored resume.

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
- bulletFeedback must include every item from draftBulletRewrites unless a bullet is removed for quality.
- Each bulletFeedback item must compare one original source bullet to the final rewritten bullet.
- draftBullet must exactly match the previous draft rewritten bullet for that item.
- rewrittenBullet must be the final bullet text and must appear in resumeMarkdown.
- When source facts allow it, rewrittenBullet should materially differ from draftBullet by applying the evaluation improvements.
- The feedback must explain the refinement-stage change: JD language matched, stronger verb, clearer metric, tighter scope, or truthfulness correction.
- Keep every rewritten bullet truthful to the original source bullets and interview context.
- Improve ATS alignment by matching the job description's language where the source bullets support it.
- Do not add technologies, tools, metrics, credentials, or responsibilities that are not supported by the source material.
- Preserve an ATS-safe structure: contact, summary, education, experience, projects, skills.
- resumeJson must contain the same final resume content as resumeMarkdown, but structured for LaTeX rendering.
- Keep resumeJson concise enough for a one-page Jake's Resume style PDF.
- Prefer strong relevant bullets over keyword stuffing.
- Do not include commentary outside JSON.

Draft bullet rewrites:
{_compact_json(bullets_payload)}

Draft resume:
{draft_resume_markdown}

Evaluation and required improvements:
{_compact_json(evaluation.model_dump(by_alias=True))}

Job description:
{job_description}"""
