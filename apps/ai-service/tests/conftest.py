"""Shared test fixtures for AI service tests."""

import os
import pytest


@pytest.fixture(autouse=True)
def mock_env():
    """Set environment variables for testing. Applied to every test."""
    old_key = os.environ.get("OPENROUTER_API_KEY")
    os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-placeholder-test-key-disabled"
    yield
    if old_key is None:
        os.environ.pop("OPENROUTER_API_KEY", None)
    else:
        os.environ["OPENROUTER_API_KEY"] = old_key


# Sample code fixtures

SAMPLE_FUNCTION_ORIGINAL = """\
def calculate_average(numbers: list[float]) -> float:
    \"\"\"Calculate the average of a list of numbers.\"\"\"
    if not numbers:
        raise ValueError("List cannot be empty")
    total = sum(numbers)
    return total / len(numbers)
"""

SAMPLE_FUNCTION_REBUILD = """\
def calculate_average(values):
    if not values:
        raise ValueError("List cannot be empty")
    return sum(values) / len(values)
"""

SAMPLE_FUNCTION_DIFFERENT = """\
def compute_mean(arr):
    return sum(arr) / max(len(arr), 1) if arr else 0
"""

SAMPLE_CLASS_ORIGINAL = """\
class Stack:
    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError("peek from empty stack")
        return self._items[-1]

    def is_empty(self):
        return len(self._items) == 0
"""

SAMPLE_QUIZ_CODE = """\
def is_palindrome(s: str) -> bool:
    s = s.lower().replace(" ", "")
    return s == s[::-1]
"""


@pytest.fixture
def sample_code() -> str:
    return SAMPLE_FUNCTION_ORIGINAL


@pytest.fixture
def sample_rebuild() -> str:
    return SAMPLE_FUNCTION_REBUILD


@pytest.fixture
def sample_class_code() -> str:
    return SAMPLE_CLASS_ORIGINAL


@pytest.fixture
def quiz_code() -> str:
    return SAMPLE_QUIZ_CODE
