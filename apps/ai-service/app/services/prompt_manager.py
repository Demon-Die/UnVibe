"""Prompt template loader with versioning support and text utilities."""

import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from loguru import logger

# Directory where prompt templates live relative to this file
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class PromptNotFoundError(FileNotFoundError):
    """Raised when a prompt template file cannot be found."""


@lru_cache(maxsize=32)
def load_prompt_template(name: str, version: str = "v1") -> str:
    """
    Load a prompt template from the prompts directory.

    Args:
        name: Template filename without extension (e.g. "code_generation").
        version: Version subdirectory (e.g. "v1", "v2").

    Returns:
        The raw text content of the template file.

    Raises:
        PromptNotFoundError: If the template file does not exist.
    """
    template_path = PROMPTS_DIR / version / f"{name}.txt"
    if not template_path.exists():
        available = ", ".join(
            str(p.relative_to(PROMPTS_DIR))
            for p in (PROMPTS_DIR / version).glob("*.txt")
        )
        raise PromptNotFoundError(
            f"Prompt template '{name}' not found at {template_path}. "
            f"Available templates: {available}"
        )
    return template_path.read_text(encoding="utf-8")


def render_prompt(name: str, version: str = "v1", **kwargs: object) -> str:
    """
    Load a prompt template and render it with the given keyword arguments.

    Usage:
        prompt = render_prompt("code_generation", problem_description="...", language="python")

    Args:
        name: Template name (without .txt).
        version: Prompt version directory.
        **kwargs: Variables to substitute into the template via .format().

    Returns:
        Fully rendered prompt string.
    """
    template = load_prompt_template(name, version)
    return template.format(**kwargs)


def list_available_templates(version: str = "v1") -> list[str]:
    """List all template names available for a given version."""
    dir_path = PROMPTS_DIR / version
    if not dir_path.exists():
        return []
    return sorted(p.stem for p in dir_path.glob("*.txt"))


def strip_markdown_fence(text: str) -> str:
    """Strip markdown code fences (```json ... ```) if present.

    Handles cases where the LLM wraps JSON or code output in markdown
    code blocks with optional language identifiers.
    """
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        if text.endswith("```"):
            text = text[:-3].strip()
        elif "```" in text:
            text = text[: text.rindex("```")].strip()
    return text
