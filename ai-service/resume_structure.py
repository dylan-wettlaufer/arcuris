"""Merge LLM output with inventory structure so all experience/project rows are preserved."""

from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher
from typing import Protocol

from schemas import (
    BulletFeedback,
    BulletRewrite,
    GeneratedResumeContact,
    GeneratedResumeEducation,
    GeneratedResumeExperience,
    GeneratedResumeJson,
    GeneratedResumeProject,
    GeneratedResumeSkillGroup,
    ParsedResume,
    ParsedResumeExperience,
    ParsedResumeProject,
)

logger = logging.getLogger(__name__)

MAX_TOTAL_BULLETS = 22
_SIMILARITY_THRESHOLD = 0.72

_WHITESPACE_RE = re.compile(r"\s+")


class _RewriteLike(Protocol):
    source: str
    originalBullet: str
    rewrittenBullet: str


def _normalize_text(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value.strip().lower())


def format_dates(start: str | None, end: str | None) -> str | None:
    start_s = (start or "").strip()
    end_s = (end or "").strip()
    if start_s and end_s:
        if "–" in start_s or "—" in start_s or " - " in start_s:
            return start_s
        return f"{start_s} – {end_s}"
    if start_s:
        return start_s
    if end_s:
        return end_s
    return None


def _project_bullets_from_parsed(project: ParsedResumeProject) -> list[str]:
    bullets = [b.strip() for b in project.bullets if b.strip()]
    if bullets:
        return bullets
    description = (project.description or "").strip()
    if description:
        return [description]
    return ["Contributed to project deliverables."]


def _experience_bullets_from_parsed(exp: ParsedResumeExperience) -> list[str]:
    bullets = [b.strip() for b in exp.bullets if b.strip()]
    if bullets:
        return bullets
    return ["Contributed to team goals and deliverables."]


def _education_from_parsed(
    parsed: ParsedResume,
    llm: GeneratedResumeJson | None,
) -> list[GeneratedResumeEducation]:
    if parsed.education:
        out: list[GeneratedResumeEducation] = []
        for edu in parsed.education:
            institution = (edu.institution or "").strip() or "Institution"
            degree_parts = [
                p.strip()
                for p in [(edu.degree or "").strip(), (edu.fieldOfStudy or "").strip()]
                if p.strip()
            ]
            degree = ", ".join(degree_parts) if degree_parts else None
            details = [d.strip() for d in edu.details if d.strip()][:4]
            out.append(
                GeneratedResumeEducation(
                    institution=institution,
                    degree=degree,
                    location=None,
                    dates=format_dates(edu.startDate, edu.endDate),
                    details=details,
                )
            )
        return out

    if llm is not None and llm.education:
        return list(llm.education)

    return [
        GeneratedResumeEducation(
            institution="Education",
            degree=None,
            location=None,
            dates=None,
            details=[],
        )
    ]


def skeleton_from_parsed(
    parsed: ParsedResume,
    llm: GeneratedResumeJson | None = None,
) -> GeneratedResumeJson:
    name = (parsed.name or "").strip() or "Candidate"
    if llm is not None and llm.contact.name.strip():
        name = llm.contact.name.strip()

    contact = GeneratedResumeContact(
        name=name,
        email=parsed.email or (llm.contact.email if llm else None),
        phone=parsed.phone or (llm.contact.phone if llm else None),
        linkedin=parsed.linkedin or (llm.contact.linkedin if llm else None),
        github=parsed.github or (llm.contact.github if llm else None),
        location=llm.contact.location if llm else None,
    )

    summary = (parsed.summary or "").strip()
    if llm is not None and llm.summary.strip():
        summary = llm.summary.strip()
    if not summary:
        summary = "Software engineering student seeking a full-time role."

    experience_rows: list[GeneratedResumeExperience] = []
    if parsed.experience:
        for exp in parsed.experience:
            company = (exp.company or "").strip() or "Company"
            role = (exp.role or "").strip() or "Role"
            experience_rows.append(
                GeneratedResumeExperience(
                    company=company,
                    role=role,
                    location=(exp.location or "").strip() or None,
                    dates=format_dates(exp.startDate, exp.endDate),
                    bullets=_experience_bullets_from_parsed(exp),
                )
            )
    elif llm is not None and llm.experience:
        experience_rows = list(llm.experience)

    project_rows: list[GeneratedResumeProject] = []
    for proj_idx, project in enumerate(parsed.projects):
        name_p = (project.name or "").strip() or "Project"
        tech = [t.strip() for t in project.techStack if t.strip()][:12]
        dates: str | None = None
        if llm is not None and proj_idx < len(llm.projects):
            dates = llm.projects[proj_idx].dates
        project_rows.append(
            GeneratedResumeProject(
                name=name_p,
                techStack=tech,
                dates=dates,
                bullets=_project_bullets_from_parsed(project),
            )
        )
    if not parsed.projects and llm is not None:
        project_rows = list(llm.projects)

    skills: list[GeneratedResumeSkillGroup] = []
    if parsed.skill_groups:
        for group in parsed.skill_groups:
            items = [i.strip() for i in group.items if i.strip()]
            if not items:
                items = ["See resume"]
            skills.append(
                GeneratedResumeSkillGroup(category=group.category, items=items)
            )
    elif llm is not None and llm.skills:
        skills = list(llm.skills)
    else:
        skills = [GeneratedResumeSkillGroup(category="Skills", items=["See resume"])]

    if not experience_rows:
        experience_rows = [
            GeneratedResumeExperience(
                company="Experience",
                role="Contributor",
                location=None,
                dates=None,
                bullets=["See resume for details."],
            )
        ]

    return GeneratedResumeJson(
        contact=contact,
        summary=summary,
        education=_education_from_parsed(parsed, llm),
        experience=experience_rows,
        projects=project_rows,
        skills=skills,
    )


def apply_llm_extras(
    skeleton: GeneratedResumeJson,
    llm: GeneratedResumeJson,
) -> None:
    if llm.summary.strip():
        skeleton.summary = llm.summary.strip()
    if llm.skills:
        skeleton.skills = list(llm.skills)
    if llm.education and not skeleton.education:
        skeleton.education = list(llm.education)


def _source_matches_label(source: str, label: str) -> bool:
    norm_source = _normalize_text(source)
    norm_label = _normalize_text(label)
    if norm_source == norm_label:
        return True
    if norm_source in norm_label or norm_label in norm_source:
        return True
    return SequenceMatcher(None, norm_source, norm_label).ratio() >= 0.55


def _find_bullet_slot(
    resume: GeneratedResumeJson,
    *,
    source: str,
    original: str,
    used: set[tuple[str, int, int]],
) -> tuple[str, int, int] | None:
    norm_original = _normalize_text(original)
    candidates: list[tuple[float, str, int, int]] = []

    for exp_idx, exp in enumerate(resume.experience):
        label = f"{exp.role} · {exp.company}"
        for bullet_idx, bullet in enumerate(exp.bullets):
            key = ("exp", exp_idx, bullet_idx)
            if key in used:
                continue
            norm_bullet = _normalize_text(bullet)
            ratio = SequenceMatcher(None, norm_original, norm_bullet).ratio()
            if norm_original == norm_bullet or ratio >= _SIMILARITY_THRESHOLD:
                score = ratio + (0.15 if _source_matches_label(source, label) else 0)
                candidates.append((score, "exp", exp_idx, bullet_idx))

    for proj_idx, project in enumerate(resume.projects):
        label = project.name
        for bullet_idx, bullet in enumerate(project.bullets):
            key = ("proj", proj_idx, bullet_idx)
            if key in used:
                continue
            norm_bullet = _normalize_text(bullet)
            ratio = SequenceMatcher(None, norm_original, norm_bullet).ratio()
            if norm_original == norm_bullet or ratio >= _SIMILARITY_THRESHOLD:
                score = ratio + (0.15 if _source_matches_label(source, label) else 0)
                candidates.append((score, "proj", proj_idx, bullet_idx))

    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    _, section, row_idx, bullet_idx = candidates[0]
    return (section, row_idx, bullet_idx)


def apply_rewrites(
    resume: GeneratedResumeJson,
    rewrites: list[BulletRewrite] | list[BulletFeedback],
) -> set[tuple[str, int, int]]:
    used: set[tuple[str, int, int]] = set()
    protected: set[tuple[str, int, int]] = set()

    for entry in rewrites:
        original = entry.originalBullet
        rewritten = entry.rewrittenBullet.strip()
        if not rewritten:
            continue

        slot = _find_bullet_slot(
            resume, source=entry.source, original=original, used=used
        )
        if slot is None:
            logger.warning(
                "Could not match rewrite to inventory bullet: source=%r",
                entry.source,
            )
            continue

        used.add(slot)
        protected.add(slot)
        section, row_idx, bullet_idx = slot
        if section == "exp":
            resume.experience[row_idx].bullets[bullet_idx] = rewritten
        else:
            resume.projects[row_idx].bullets[bullet_idx] = rewritten

    return protected


def trim_bullets_for_one_page(
    resume: GeneratedResumeJson,
    protected: set[tuple[str, int, int]],
) -> None:
    def total_bullets() -> int:
        return sum(len(e.bullets) for e in resume.experience) + sum(
            len(p.bullets) for p in resume.projects
        )

    removal_order: list[tuple[str, int, int]] = []
    for proj_idx in range(len(resume.projects) - 1, -1, -1):
        for bullet_idx in range(len(resume.projects[proj_idx].bullets) - 1, -1, -1):
            removal_order.append(("proj", proj_idx, bullet_idx))
    for exp_idx in range(len(resume.experience) - 1, -1, -1):
        for bullet_idx in range(len(resume.experience[exp_idx].bullets) - 1, -1, -1):
            removal_order.append(("exp", exp_idx, bullet_idx))

    for slot in removal_order:
        if total_bullets() <= MAX_TOTAL_BULLETS:
            break
        if slot in protected:
            continue
        section, row_idx, bullet_idx = slot
        if section == "exp":
            bullets = resume.experience[row_idx].bullets
            if len(bullets) <= 1:
                continue
            bullets.pop(bullet_idx)
        else:
            bullets = resume.projects[row_idx].bullets
            if len(bullets) <= 1:
                continue
            bullets.pop(bullet_idx)


def _assert_structure_counts(parsed: ParsedResume, resume: GeneratedResumeJson) -> None:
    if parsed.experience and len(resume.experience) != len(parsed.experience):
        logger.warning(
            "Experience count mismatch after merge: parsed=%s resume=%s",
            len(parsed.experience),
            len(resume.experience),
        )
    if parsed.projects and len(resume.projects) != len(parsed.projects):
        logger.warning(
            "Project count mismatch after merge: parsed=%s resume=%s",
            len(parsed.projects),
            len(resume.projects),
        )


def merge_with_inventory(
    parsed: ParsedResume,
    llm_json: GeneratedResumeJson,
    rewrites: list[BulletRewrite] | list[BulletFeedback],
) -> GeneratedResumeJson:
    skeleton = skeleton_from_parsed(parsed, llm_json)
    apply_llm_extras(skeleton, llm_json)
    protected = apply_rewrites(skeleton, rewrites)
    trim_bullets_for_one_page(skeleton, protected)
    _assert_structure_counts(parsed, skeleton)
    return skeleton


def render_resume_markdown(resume: GeneratedResumeJson) -> str:
    lines: list[str] = []

    contact_bits = [resume.contact.name]
    for field in (
        resume.contact.email,
        resume.contact.phone,
        resume.contact.location,
        resume.contact.linkedin,
        resume.contact.github,
    ):
        if field and field.strip():
            contact_bits.append(field.strip())
    lines.append(contact_bits[0])
    if len(contact_bits) > 1:
        lines.append(" | ".join(contact_bits[1:]))

    lines.append("")
    lines.append("SUMMARY")
    lines.append(resume.summary.strip())

    if resume.education:
        lines.append("")
        lines.append("EDUCATION")
        for edu in resume.education:
            header_parts = [edu.institution]
            if edu.degree:
                header_parts.append(edu.degree)
            if edu.dates:
                header_parts.append(edu.dates)
            lines.append(" · ".join(header_parts))
            for detail in edu.details:
                lines.append(f"- {detail}")

    if resume.experience:
        lines.append("")
        lines.append("EXPERIENCE")
        for exp in resume.experience:
            header = f"{exp.role} · {exp.company}"
            if exp.dates:
                header = f"{header} · {exp.dates}"
            lines.append(header)
            for bullet in exp.bullets:
                lines.append(f"- {bullet}")

    if resume.projects:
        lines.append("")
        lines.append("PROJECTS")
        for project in resume.projects:
            header = project.name
            if project.techStack:
                header = f"{header} ({', '.join(project.techStack)})"
            if project.dates:
                header = f"{header} · {project.dates}"
            lines.append(header)
            for bullet in project.bullets:
                lines.append(f"- {bullet}")

    if resume.skills:
        lines.append("")
        lines.append("SKILLS")
        for group in resume.skills:
            lines.append(f"{group.category}: {', '.join(group.items)}")

    return "\n".join(lines).strip() + "\n"
