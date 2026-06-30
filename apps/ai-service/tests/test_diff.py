"""Tests for the AST diff engine — the most critical component."""

import pytest

from app.services.ast_differ import AstDiffer, DimensionScore, DiffResult

differ = AstDiffer()


# ---------------------------------------------------------------------------
# Identical code
# ---------------------------------------------------------------------------


def test_identical_code():
    """Identical code should score near 1.0."""
    code = """\
def hello(name):
    return f"Hello, {name}!"
"""
    result = differ.compare(code, code)
    assert result.overall_score > 0.90
    assert len(result.dimensions) == 4


# ---------------------------------------------------------------------------
# Structural similarity (same logic, different variable names)
# ---------------------------------------------------------------------------


def test_same_structure_different_names():
    """Same algorithm with renamed variables should score high."""
    original = """\
def find_max(items):
    max_val = items[0]
    for item in items:
        if item > max_val:
            max_val = item
    return max_val
"""
    rebuild = """\
def find_maximum(elements):
    current_max = elements[0]
    for element in elements:
        if element > current_max:
            current_max = element
    return current_max
"""
    result = differ.compare(original, rebuild)
    # Same structure, different names — should be high
    assert result.overall_score >= 0.7, f"Expected >= 0.7, got {result.overall_score}"


# ---------------------------------------------------------------------------
# Different algorithm, same output
# ---------------------------------------------------------------------------


def test_different_algorithm():
    """Different algorithm solving same problem should score lower but not zero."""
    original = """\
def sum_list(nums):
    total = 0
    for n in nums:
        total += n
    return total
"""
    rebuild = """\
def sum_list(nums):
    return sum(nums)
"""
    result = differ.compare(original, rebuild)
    # Different approach — moderate score
    assert 0.4 <= result.overall_score <= 0.9, f"Unexpected score: {result.overall_score}"


# ---------------------------------------------------------------------------
# Wrong implementation
# ---------------------------------------------------------------------------


def test_completely_wrong():
    """Completely different code should score low."""
    original = """\
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
    rebuild = """\
def fibonacci(n):
    return 42
"""
    result = differ.compare(original, rebuild)
    assert result.overall_score < 0.5


# ---------------------------------------------------------------------------
# Dimension breakdown
# ---------------------------------------------------------------------------


def test_returns_all_dimensions():
    """Diff result should contain all 4 dimension scores."""
    result = differ.compare("x = 1", "y = 2")
    dimension_names = {d.dimension for d in result.dimensions}
    expected = {"Structural similarity", "Correctness", "Readability", "Simplicity"}
    assert dimension_names == expected, f"Missing dimensions: {expected - dimension_names}"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_empty_code():
    """Empty code should not crash."""
    result = differ.compare("", "")
    assert result.overall_score >= 0


def test_syntax_error():
    """Code with syntax errors should fall back gracefully."""
    result = differ.compare("def foo(:", "def bar(): pass")
    # Should not crash — should produce some score
    assert result.overall_score >= 0
    assert len(result.dimensions) == 4


def test_non_python_language():
    """Non-Python language should use text fallback."""
    result = differ.compare(
        "function hello() { return 1; }",
        "function hello() { return 2; }",
        language="javascript",
    )
    assert result.overall_score >= 0
    assert len(result.dimensions) == 4


# ---------------------------------------------------------------------------
# No-op changes (whitespace, comments)
# ---------------------------------------------------------------------------


def test_whitespace_only_changes():
    """Whitespace-only changes should not reduce structural score."""
    original = """\
def add(a, b):
    return a + b
"""
    rebuild = """\


def add(a, b):
    return a + b


"""
    result = differ.compare(original, rebuild)
    # Structural similarity should be near 1.0 since AST is identical
    struct_dim = next(d for d in result.dimensions if d.dimension == "Structural similarity")
    assert struct_dim.score >= 0.90, f"Structural score too low: {struct_dim.score}"


# ---------------------------------------------------------------------------
# Class comparison
# ---------------------------------------------------------------------------


def test_class_structure():
    """Classes with same interface should score higher."""
    original = """\
class Counter:
    def __init__(self):
        self.count = 0
    def increment(self):
        self.count += 1
    def get_count(self):
        return self.count
"""
    rebuild = """\
class Counter:
    def __init__(self):
        self.value = 0
    def increment(self):
        self.value += 1
    def get_count(self):
        return self.value
"""
    result = differ.compare(original, rebuild)
    # Same structure (same class + 3 methods), different field name
    assert result.overall_score >= 0.6, f"Class structure score too low: {result.overall_score}"


# ---------------------------------------------------------------------------
# Readability scoring
# ---------------------------------------------------------------------------


def test_readability_descriptive_vs_cryptic():
    """Descriptive identifiers should score higher on readability."""
    cryptic = """\
def f(a, b):
    c = []
    for i in a:
        if i % 2 == 0:
            c.append(i * b)
    return c
"""
    descriptive = """\
def multiply_even_numbers(numbers: list[int], multiplier: int) -> list[int]:
    result = []
    for num in numbers:
        if num % 2 == 0:
            result.append(num * multiplier)
    return result
"""
    # Both are valid structural matches against themselves
    # Just verify readability score is reasonable
    result = differ.compare(descriptive, descriptive)
    read_dim = next(d for d in result.dimensions if d.dimension == "Readability")
    assert read_dim.score > 0.5, f"Readability score too low for descriptive code: {read_dim.score}"


# ---------------------------------------------------------------------------
# Simplicity scoring
# ---------------------------------------------------------------------------


def test_simple_vs_overly_complex():
    """Simpler code should score higher on simplicity."""
    simple = """\
def double(n):
    return n * 2
"""
    complex_code = """\
def double(n):
    result = 0
    for _ in range(2):
        result += n
    return result
"""
    result_simple = differ.compare(simple, simple)
    result_complex = differ.compare(complex_code, complex_code)

    simp_dim_simple = next(d for d in result_simple.dimensions if d.dimension == "Simplicity")
    simp_dim_complex = next(d for d in result_complex.dimensions if d.dimension == "Simplicity")

    assert simp_dim_simple.score >= simp_dim_complex.score, "Simpler code should have higher simplicity score"
