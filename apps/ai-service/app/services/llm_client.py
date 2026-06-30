"""
Universal LLM client using OpenRouter's unified API.

OpenRouter provides a single endpoint for 200+ models from OpenAI, Anthropic,
Google, Meta, Mistral, DeepSeek, and more. Switch models by changing ONE env var.

Requirements:
    OPENROUTER_API_KEY=sk-or-v1-...
    LLM_MODEL=google/gemini-2.0-flash-001   (or any OpenRouter model ID)

Uses the OpenAI SDK pointed at OpenRouter's base URL for maximum model compatibility.
"""

import time
from typing import Optional

from openai import OpenAI, APIError, RateLimitError, APITimeoutError, APIConnectionError, Timeout
from loguru import logger

from app.config import get_settings


class LLMClientError(Exception):
    """Raised when the LLM API call fails after all retries."""


class LLMClient:
    """
    Universal LLM client via OpenRouter with retry and logging.

    Works with ANY model OpenRouter supports — just change the LLM_MODEL env var.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openrouter_api_key
        self.base_url = settings.openrouter_base_url
        self.model = settings.llm_model
        self.default_max_tokens = settings.max_tokens
        self.site_url = settings.openrouter_site_url
        self.app_name = settings.openrouter_app_name
        self._client: Optional[OpenAI] = None

    def _ensure_client(self) -> OpenAI:
        if self._client is None:
            if not self.api_key:
                raise LLMClientError(
                    "OPENROUTER_API_KEY is not set. "
                    "Add it to your .env file. Get one at https://openrouter.ai/keys"
                )
            self._client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=Timeout(30.0, connect=10.0),
                default_headers={
                    "HTTP-Referer": self.site_url or "https://github.com/unvibe",
                    "X-Title": self.app_name,
                },
            )
        return self._client

    def generate(
        self,
        prompt: str,
        system: str = "",
        max_tokens: Optional[int] = None,
        retries: int = 2,
    ) -> str:
        """
        Send a prompt to the configured LLM via OpenRouter and return the text response.

        Args:
            prompt: The user message content.
            system: Optional system prompt.
            max_tokens: Max tokens in response (defaults to settings).
            retries: Number of retries on failure.

        Returns:
            The response text from the LLM.

        Raises:
            LLMClientError: If all retries are exhausted.
        """
        client = self._ensure_client()
        max_tokens = max_tokens or self.default_max_tokens

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        last_error: Optional[Exception] = None
        for attempt in range(1 + retries):
            try:
                logger.info(
                    "LLM API call via OpenRouter",
                    model=self.model,
                    prompt_length=len(prompt),
                    system_length=len(system),
                    attempt=attempt + 1,
                )

                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=max_tokens,
                )

                text = response.choices[0].message.content or ""
                usage = response.usage
                logger.info(
                    "LLM API success",
                    model=self.model,
                    input_tokens=usage.input_tokens if usage else "unknown",
                    output_tokens=usage.output_tokens if usage else "unknown",
                )
                return text

            except RateLimitError as exc:
                last_error = exc
                wait = 2 ** (attempt + 1)
                logger.warning(
                    f"Rate limited by {self.model}, retrying in {wait}s "
                    f"(attempt {attempt + 1}/{retries + 1})"
                )
                time.sleep(wait)

            except (APIError, APITimeoutError, APIConnectionError) as exc:
                last_error = exc
                if attempt < retries:
                    wait = 2 ** attempt
                    logger.warning(
                        f"LLM API error: {exc}. Retrying in {wait}s "
                        f"(attempt {attempt + 1}/{retries + 1})"
                    )
                    time.sleep(wait)
                else:
                    logger.error(
                        f"LLM API failed after {retries + 1} attempts: {exc}"
                    )

            except Exception as exc:
                last_error = exc
                logger.error(f"Unexpected LLM client error: {exc}")
                break

        raise LLMClientError(
            f"LLM API call to {self.model} failed after {retries + 1} attempts"
        ) from last_error

    async def generate_async(
        self,
        prompt: str,
        system: str = "",
        max_tokens: Optional[int] = None,
        retries: int = 2,
    ) -> str:
        """Async version — runs the sync generate in a thread pool."""
        from anyio import to_thread

        return await to_thread.run_sync(
            self.generate, prompt, system, max_tokens, retries
        )

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    @property
    def model_name(self) -> str:
        """The currently configured model identifier."""
        return self.model

    def list_available_models(self) -> list[str]:
        """
        Fetch available models from OpenRouter.

        Returns a list of model IDs (e.g. 'google/gemini-2.0-flash-001').
        May be empty if the API call fails.
        """
        try:
            client = self._ensure_client()
            models = client.models.list()
            return sorted(m.id for m in models)
        except Exception as exc:
            logger.warning(f"Failed to fetch model list: {exc}")
            return []


# Module-level singleton — import and use directly
llm = LLMClient()
