"""Application configuration loaded from environment variables."""

import os
from functools import lru_cache


class Settings:
    """Settings loaded from environment / .env file."""

    def __init__(self) -> None:
        # OpenRouter provides unified access to 200+ models
        self.openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
        self.openrouter_base_url: str = os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )
        # Your site URL for OpenRouter rankings (set to your domain or leave blank)
        self.openrouter_site_url: str = os.getenv("OPENROUTER_SITE_URL", "")
        self.openrouter_app_name: str = os.getenv("OPENROUTER_APP_NAME", "UnVibe")

        # Model selection — change this to switch providers
        # Options: google/gemini-2.0-flash-001, openai/gpt-4o-mini,
        #          anthropic/claude-sonnet-4-20250514, meta-llama/llama-3.3-70b-instruct,
        #          deepseek/deepseek-chat, mistralai/mistral-large-2407
        self.llm_model: str = os.getenv("LLM_MODEL", "google/gemini-2.0-flash-001")
        self.max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "4096"))
        self.ai_service_port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))

    @property
    def has_llm_key(self) -> bool:
        """Check if a usable API key is configured."""
        key = self.openrouter_api_key
        return bool(key) and key != "" and not key.startswith("sk-or-v1-placeholder")

    @property
    def llm_key_preview(self) -> str:
        """Return masked key for logging (first 8 chars)."""
        k = self.openrouter_api_key
        return f"{k[:8]}...{k[-4:]}" if len(k) > 12 else "(invalid)"


@lru_cache()
def get_settings() -> Settings:
    """Return singleton settings instance."""
    return Settings()
