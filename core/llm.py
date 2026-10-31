"""Provider-agnostic OpenAI-compatible LLM factory for ClaimGuard / Gemma 4."""

from __future__ import annotations

import base64
import json
import re
from typing import Any, Optional, Type, TypeVar

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from core.config import settings

T = TypeVar("T", bound=BaseModel)


def get_llm(
    model: Optional[str] = None,
    temperature: float = 0.0,
    *,
    client_openrouter_key: Optional[str] = None,
    client_cerebras_key: Optional[str] = None,
):
    """
    Return a ChatOpenAI (OpenAI-compatible) client.

    Primary: LLM_BASE_URL / LLM_API_KEY / LLM_MODEL (or profile model override).
    Fallback: LLM_FALLBACK_* if configured.
    Legacy: Groq / Cerebras / OpenRouter only when primary key is empty (env model names).
    """
    model_name = model or settings.LLM_MODEL
    primary_key = settings.LLM_API_KEY
    primary_base = settings.LLM_BASE_URL

    # Prefer explicit ClaimGuard LLM_* routing
    if primary_key or primary_base:
        primary = ChatOpenAI(
            model=model_name,
            base_url=primary_base or None,
            api_key=primary_key or "not-needed",
            temperature=temperature,
            max_retries=1,
        )
        fallbacks = []
        if settings.LLM_FALLBACK_BASE_URL:
            fallbacks.append(
                ChatOpenAI(
                    model=settings.LLM_FALLBACK_MODEL,
                    base_url=settings.LLM_FALLBACK_BASE_URL,
                    api_key=settings.LLM_FALLBACK_API_KEY or "ollama",
                    temperature=temperature,
                    max_retries=0,
                )
            )
        if fallbacks:
            return primary.with_fallbacks(fallbacks)
        return primary

    # Legacy last-resort path — model names still from env only
    groq_model = os_getenv("GROQ_MODEL", "")
    if settings.GROQ_API_KEY and groq_model:
        from langchain_groq import ChatGroq

        primary = ChatGroq(
            model=groq_model,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
            max_retries=0,
        )
        fallbacks = []
        cerebras_key = client_cerebras_key or settings.CEREBRAS_API_KEY
        cerebras_model = os_getenv("CEREBRAS_MODEL", "")
        if cerebras_key and cerebras_model:
            fallbacks.append(
                ChatOpenAI(
                    model=cerebras_model,
                    base_url="https://api.cerebras.ai/v1",
                    api_key=cerebras_key,
                    temperature=temperature,
                )
            )
        openrouter_key = client_openrouter_key or settings.OPENROUTER_API_KEY
        openrouter_model = os_getenv("OPENROUTER_MODEL", "")
        if openrouter_key and openrouter_model:
            fallbacks.append(
                ChatOpenAI(
                    model=openrouter_model,
                    base_url="https://openrouter.ai/api/v1",
                    api_key=openrouter_key,
                    temperature=temperature,
                )
            )
        return primary.with_fallbacks(fallbacks) if fallbacks else primary

    # Deterministic mock for offline / pytest when no keys are set
    return _MockLLM()


def os_getenv(key: str, default: str = "") -> str:
    import os

    return os.getenv(key, default)


class _MockLLM:
    """Minimal stand-in so /health and mocked tests work without API keys."""

    def invoke(self, messages, **kwargs):
        class _R:
            content = "{}"

        return _R()

    def with_fallbacks(self, _fallbacks):
        return self

    def with_structured_output(self, schema, **kwargs):
        return self


def _extract_json(text: str) -> Any:
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty LLM response")
    # Strip markdown fences if present
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Find outermost object/array
        start_obj, start_arr = text.find("{"), text.find("[")
        if start_obj == -1 and start_arr == -1:
            raise
        if start_obj == -1 or (start_arr != -1 and start_arr < start_obj):
            start, end_char = start_arr, "]"
        else:
            start, end_char = start_obj, "}"
        end = text.rfind(end_char)
        return json.loads(text[start : end + 1])


def parse_json_response(text: str, schema: Type[T], repair_once: bool = True) -> T:
    """Parse LLM text into a pydantic model; one repair attempt on failure."""
    try:
        data = _extract_json(text)
        return schema.model_validate(data)
    except Exception as first_err:
        if not repair_once:
            raise first_err
        # Caller may pass already-repaired text; re-raise for pipeline to retry
        raise ValueError(f"JSON parse failed: {first_err}") from first_err


def vision_json(
    prompt: str,
    image_b64: str,
    schema: Type[T],
    *,
    system: str = "",
    model: Optional[str] = None,
    mime: str = "image/jpeg",
) -> T:
    """
    Send a vision prompt + base64 image; expect JSON matching schema.
    Retries once with a repair prompt if parsing fails.
    """
    llm = get_llm(model=model, temperature=0.0)
    content = [
        {"type": "text", "text": prompt},
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{image_b64}"},
        },
    ]
    messages = []
    if system:
        messages.append(SystemMessage(content=system))
    messages.append(HumanMessage(content=content))

    response = llm.invoke(messages)
    raw = getattr(response, "content", None) or str(response)
    try:
        return parse_json_response(raw, schema, repair_once=False)
    except Exception:
        repair = [
            SystemMessage(
                content="Return ONLY valid JSON matching the required schema. No markdown."
            ),
            HumanMessage(
                content=f"Fix this into valid JSON only:\n{raw}\n\nSchema hint: {schema.model_json_schema()}"
            ),
        ]
        repaired = llm.invoke(repair)
        repaired_raw = getattr(repaired, "content", None) or str(repaired)
        return parse_json_response(repaired_raw, schema, repair_once=False)


def text_json(
    prompt: str,
    schema: Type[T],
    *,
    system: str = "",
    model: Optional[str] = None,
) -> T:
    """Text-only JSON call with one repair retry."""
    llm = get_llm(model=model, temperature=0.0)
    messages = []
    if system:
        messages.append(SystemMessage(content=system))
    messages.append(HumanMessage(content=prompt))
    response = llm.invoke(messages)
    raw = getattr(response, "content", None) or str(response)
    try:
        return parse_json_response(raw, schema, repair_once=False)
    except Exception:
        repair = [
            SystemMessage(content="Return ONLY valid JSON. No markdown."),
            HumanMessage(
                content=f"Fix into valid JSON only:\n{raw}\n\nSchema: {schema.model_json_schema()}"
            ),
        ]
        repaired = llm.invoke(repair)
        repaired_raw = getattr(repaired, "content", None) or str(repaired)
        return parse_json_response(repaired_raw, schema, repair_once=False)


def encode_image_bytes(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")
