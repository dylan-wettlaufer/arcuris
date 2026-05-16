"""Gemini JSON generation — parity with lib/resume-generation.ts + lib/gemini.ts."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import google.generativeai as genai

MODEL_NAME = "gemini-2.5-flash"

_fence_pattern = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def parse_json_from_text(text: str) -> Any:
    trimmed = _fence_pattern.sub("", text.strip())
    return json.loads(trimmed)


def _ensure_api_key() -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")
    genai.configure(api_key=api_key)


def generate_json_content(*, contents: str, system_instruction: str) -> dict[str, Any]:
    """Run Gemini with JSON output; return parsed object (must be a dict)."""
    _ensure_api_key()

    model = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=system_instruction,
    )

    response = model.generate_content(
        contents,
        generation_config=genai.GenerationConfig(
            temperature=0.25,
            response_mime_type="application/json",
        ),
    )

    try:
        response_text = (response.text or "").strip()
    except ValueError as exc:
        raise RuntimeError("Gemini returned no text (blocked or empty response).") from exc

    if len(response_text) == 0:
        raise RuntimeError("AI did not return generation JSON.")

    parsed = parse_json_from_text(response_text)
    if not isinstance(parsed, dict):
        raise ValueError("AI JSON root must be an object.")

    return parsed
