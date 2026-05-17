"""Three-pass resume generation task (draft → evaluate → refine)."""

from __future__ import annotations

from typing import Any

from celery_app import celery_app
from gemini_gen import generate_json_content
from prompts import (
    build_draft_resume_prompt,
    build_evaluate_resume_prompt,
    build_refine_resume_prompt,
)
from schemas import (
    GeneratedDraft,
    ParsedResume,
    RefinedResume,
    ResumeEvaluation,
    merge_generated_resume,
)

SYSTEM_DRAFT = (
    "You generate truthful, ATS-safe tailored resumes for new grad software "
    "engineering roles. Return only valid JSON."
)

SYSTEM_EVALUATE = (
    "You evaluate only rewritten resume bullets against original source bullets "
    "and job descriptions with strict integer scoring. The improvements field "
    "must always be a JSON array of exactly five strings — never four, six, or "
    "any other length. Return only valid JSON."
)

SYSTEM_REFINE = (
    "You refine JD-tailored resume bullets using evaluation feedback and interview "
    "context; leave non-targeted bullets unchanged. Return only valid JSON."
)


@celery_app.task(name="tasks.process_resume")
def process_resume(
    parsed_resume: dict[str, Any],
    interview_answers: dict[str, str],
    job_description: str,
) -> dict[str, Any]:
    parsed = ParsedResume.model_validate(parsed_resume)

    draft_raw = generate_json_content(
        contents=build_draft_resume_prompt(
            parsed_resume=parsed,
            interview_answers=interview_answers,
            job_description=job_description,
        ),
        system_instruction=SYSTEM_DRAFT,
    )
    draft = GeneratedDraft.model_validate(draft_raw)

    evaluation_raw = generate_json_content(
        contents=build_evaluate_resume_prompt(
            draft_resume_markdown=draft.resumeMarkdown,
            draft_bullet_rewrites=draft.bulletRewrites,
            job_description=job_description,
        ),
        system_instruction=SYSTEM_EVALUATE,
    )
    evaluation = ResumeEvaluation.model_validate(evaluation_raw)

    refined_raw = generate_json_content(
        contents=build_refine_resume_prompt(
            draft_resume_markdown=draft.resumeMarkdown,
            draft_bullet_rewrites=draft.bulletRewrites,
            evaluation=evaluation,
            interview_answers=interview_answers,
            job_description=job_description,
        ),
        system_instruction=SYSTEM_REFINE,
    )
    refined = RefinedResume.model_validate(refined_raw)

    return merge_generated_resume(draft, evaluation, refined)
