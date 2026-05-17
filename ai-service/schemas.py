"""Pydantic models aligned with lib/types.ts (parsed resume input + generation outputs)."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_QUESTION_ID_PATTERN = re.compile(r"^[a-z0-9_]+$")


# --- Parsed resume (inventory) ------------------------------------------------


class ParsedResumeEducation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution: str | None = None
    degree: str | None = None
    fieldOfStudy: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    details: list[str] = Field(default_factory=list)


class ParsedResumeExperience(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    company: str | None = None
    role: str | None = None
    location: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    bullets: list[str] = Field(default_factory=list)
    is_technical_role: bool = Field(default=True, alias="isTechnicalRole")


class ParsedResumeProject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    description: str | None = None
    techStack: list[str] = Field(default_factory=list)
    bullets: list[str] = Field(default_factory=list)


class ParsedResumeSkillGroup(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: str = Field(..., min_length=1, max_length=80)
    items: list[str] = Field(default_factory=list, max_length=48)

    @field_validator("items", mode="after")
    @classmethod
    def normalize_items(cls, items: list[str]) -> list[str]:
        out: list[str] = []
        for item in items:
            if not isinstance(item, str):
                continue
            s = item.strip()
            if len(s) < 1 or len(s) > 120:
                continue
            out.append(s)
        return out


class ParsedResume(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    github: str | None = None
    summary: str | None = None
    education: list[ParsedResumeEducation] = Field(default_factory=list)
    experience: list[ParsedResumeExperience] = Field(default_factory=list)
    projects: list[ParsedResumeProject] = Field(default_factory=list)
    skill_groups: list[ParsedResumeSkillGroup] = Field(
        default_factory=list,
        alias="skillGroups",
        max_length=8,
    )


# --- Job enqueue ----------------------------------------------------------------


class GenerateJobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    parsed_resume: ParsedResume
    interview_answers: dict[str, str]
    job_description: str = Field(..., min_length=200, max_length=60_000)

    @model_validator(mode="after")
    def validate_interview_keys_and_trim_answers(self) -> GenerateJobRequest:
        trimmed: dict[str, str] = {}
        for key, value in self.interview_answers.items():
            if len(key) < 1 or len(key) > 80 or _QUESTION_ID_PATTERN.fullmatch(key) is None:
                raise ValueError("Interview answer keys must match /^[a-z0-9_]+$/ and length 1–80.")
            trimmed[key] = value.strip()
            if len(trimmed[key]) < 1:
                raise ValueError("Interview answers must be non-empty after trim.")
        self.interview_answers = trimmed
        return self


# --- Generated resume JSON shapes ----------------------------------------------


class GeneratedResumeContact(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(..., min_length=1, max_length=160)
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    github: str | None = None
    location: str | None = None


class GeneratedResumeEducation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    institution: str = Field(..., min_length=1, max_length=160)
    degree: str | None = None
    location: str | None = None
    dates: str | None = None
    details: list[str] = Field(default_factory=list)

    @field_validator("details", mode="after")
    @classmethod
    def validate_details(cls, details: list[str]) -> list[str]:
        if len(details) > 4:
            raise ValueError("education.details must have at most 4 items.")
        out: list[str] = []
        for item in details:
            s = item.strip()
            if len(s) < 1 or len(s) > 240:
                raise ValueError("Each education detail must be 1–240 characters.")
            out.append(s)
        return out


class GeneratedResumeExperience(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    company: str = Field(..., min_length=1, max_length=160)
    role: str = Field(..., min_length=1, max_length=160)
    location: str | None = None
    dates: str | None = None
    bullets: list[str] = Field(..., min_length=1, max_length=5)

    @field_validator("bullets", mode="after")
    @classmethod
    def validate_bullets(cls, bullets: list[str]) -> list[str]:
        out: list[str] = []
        for item in bullets:
            s = item.strip()
            if len(s) < 1 or len(s) > 500:
                raise ValueError("Each experience bullet must be 1–500 characters.")
            out.append(s)
        return out


class GeneratedResumeProject(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(..., min_length=1, max_length=160)
    techStack: list[str] = Field(default_factory=list, max_length=12)
    dates: str | None = None
    bullets: list[str] = Field(..., min_length=1, max_length=5)

    @field_validator("techStack", mode="after")
    @classmethod
    def validate_tech_stack(cls, items: list[str]) -> list[str]:
        out: list[str] = []
        for item in items:
            s = item.strip()
            if len(s) < 1 or len(s) > 80:
                raise ValueError("Each tech stack entry must be 1–80 characters.")
            out.append(s)
        return out

    @field_validator("bullets", mode="after")
    @classmethod
    def validate_project_bullets(cls, bullets: list[str]) -> list[str]:
        out: list[str] = []
        for item in bullets:
            s = item.strip()
            if len(s) < 1 or len(s) > 500:
                raise ValueError("Each project bullet must be 1–500 characters.")
            out.append(s)
        return out


class GeneratedResumeSkillGroup(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: str = Field(..., min_length=1, max_length=80)
    items: list[str] = Field(..., min_length=1, max_length=24)

    @field_validator("items", mode="after")
    @classmethod
    def validate_items(cls, items: list[str]) -> list[str]:
        out: list[str] = []
        for item in items:
            s = item.strip()
            if len(s) < 1 or len(s) > 80:
                raise ValueError("Each skill item must be 1–80 characters.")
            out.append(s)
        return out


class GeneratedResumeJson(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    contact: GeneratedResumeContact
    summary: str = Field(..., min_length=1, max_length=800)
    education: list[GeneratedResumeEducation] = Field(..., min_length=1, max_length=4)
    experience: list[GeneratedResumeExperience] = Field(..., min_length=1, max_length=5)
    projects: list[GeneratedResumeProject] = Field(default_factory=list, max_length=5)
    skills: list[GeneratedResumeSkillGroup] = Field(..., min_length=1, max_length=8)


class BulletRewrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source: str = Field(..., min_length=1, max_length=160)
    originalBullet: str = Field(..., min_length=1, max_length=1000)
    rewrittenBullet: str = Field(..., min_length=1, max_length=1000)


class GeneratedDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    companyName: str = Field(..., min_length=1, max_length=120)
    roleTitle: str = Field(..., min_length=1, max_length=160)
    resumeMarkdown: str = Field(..., min_length=1)
    resumeJson: GeneratedResumeJson
    bulletRewrites: list[BulletRewrite] = Field(..., min_length=1, max_length=12)


class ResumeEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    draftScore: int = Field(..., ge=1, le=10)
    keywordAlignment: int = Field(..., ge=1, le=10)
    impactClarity: int = Field(..., ge=1, le=10)
    atsFriendliness: int = Field(..., ge=1, le=10)
    narrativeFit: int = Field(..., ge=1, le=10)
    improvements: list[str] = Field(..., min_length=5, max_length=5)

    @field_validator("improvements", mode="after")
    @classmethod
    def validate_improvement_lines(cls, improvements: list[str]) -> list[str]:
        out: list[str] = []
        for item in improvements:
            s = item.strip()
            if len(s) < 1 or len(s) > 500:
                raise ValueError("Each improvement must be 1–500 characters.")
            out.append(s)
        return out


class BulletFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source: str = Field(..., min_length=1, max_length=160)
    originalBullet: str = Field(..., min_length=1, max_length=1000)
    draftBullet: str = Field(..., min_length=1, max_length=1000)
    rewrittenBullet: str = Field(..., min_length=1, max_length=1000)
    feedback: str = Field(..., min_length=1, max_length=600)


class RefinedResume(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    refinedScore: int = Field(..., ge=1, le=10)
    resumeMarkdown: str = Field(..., min_length=1)
    resumeJson: GeneratedResumeJson
    bulletFeedback: list[BulletFeedback] = Field(..., min_length=1, max_length=12)


class GeneratedResume(BaseModel):
    """Final payload matching generatedResumeSchema (TypeScript)."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    companyName: str = Field(..., min_length=1, max_length=120)
    roleTitle: str = Field(..., min_length=1, max_length=160)
    draftResumeMarkdown: str = Field(..., min_length=1)
    refinedResumeMarkdown: str = Field(..., min_length=1)
    resumeJson: GeneratedResumeJson
    draftScore: int = Field(..., ge=1, le=10)
    refinedScore: int = Field(..., ge=1, le=10)
    keywordAlignment: int = Field(..., ge=1, le=10)
    impactClarity: int = Field(..., ge=1, le=10)
    atsFriendliness: int = Field(..., ge=1, le=10)
    narrativeFit: int = Field(..., ge=1, le=10)
    improvements: list[str] = Field(..., min_length=5, max_length=5)
    bulletFeedback: list[BulletFeedback] = Field(..., min_length=1, max_length=12)

    @field_validator("improvements", mode="after")
    @classmethod
    def validate_improvement_lines(cls, improvements: list[str]) -> list[str]:
        out: list[str] = []
        for item in improvements:
            s = item.strip()
            if len(s) < 1 or len(s) > 500:
                raise ValueError("Each improvement must be 1–500 characters.")
            out.append(s)
        return out


def merge_generated_resume(
    draft: GeneratedDraft,
    evaluation: ResumeEvaluation,
    refined: RefinedResume,
) -> dict[str, Any]:
    merged = GeneratedResume(
        companyName=draft.companyName,
        roleTitle=draft.roleTitle,
        draftResumeMarkdown=draft.resumeMarkdown,
        refinedResumeMarkdown=refined.resumeMarkdown,
        resumeJson=refined.resumeJson,
        draftScore=evaluation.draftScore,
        refinedScore=refined.refinedScore,
        keywordAlignment=evaluation.keywordAlignment,
        impactClarity=evaluation.impactClarity,
        atsFriendliness=evaluation.atsFriendliness,
        narrativeFit=evaluation.narrativeFit,
        improvements=evaluation.improvements,
        bulletFeedback=refined.bulletFeedback,
    )
    return merged.model_dump(mode="json")
