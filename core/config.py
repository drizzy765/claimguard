import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ClaimGuard runtime settings. All model names come from env — never hard-code."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Primary OpenAI-compatible LLM (Gemini API Gemma 4 or self-hosted Ollama/vLLM)
    LLM_BASE_URL: str = os.getenv(
        "LLM_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemma-4-26b-a4b-it")

    # Optional fallback (e.g. Ollama on a GPU droplet)
    LLM_FALLBACK_BASE_URL: str = os.getenv("LLM_FALLBACK_BASE_URL", "")
    LLM_FALLBACK_API_KEY: str = os.getenv("LLM_FALLBACK_API_KEY", "ollama")
    LLM_FALLBACK_MODEL: str = os.getenv("LLM_FALLBACK_MODEL", "gemma4:12b")

    # API auth
    FACTORY_MASTER_KEY: str = os.getenv("FACTORY_MASTER_KEY", "")

    # Optional legacy provider keys (only used if LLM_* unset and these are set)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")


settings = Settings()
