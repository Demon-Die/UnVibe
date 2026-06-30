"""
AST-based code diff engine for scoring rebuild submissions.

Compares a user's rebuilt code against the original AI-generated solution
across four dimensions:
    - Structural similarity (40%) — control flow, signatures, data structures
    - Correctness (30%) — does the code handle edge cases correctly
    - Readability (15%) — naming, comments, organization
    - Simplicity (15%) — no unnecessary complexity

The engine uses Python's built-in `ast` module for structural comparison
and text-based heuristics for the other dimensions. It does NOT call any
external API — it runs entirely offline.
"""

import ast
import difflib
import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DimensionScore:
    """Score for a single evaluation dimension."""
    dimension: str
    score: float  # 0.0 to 1.0
    explanation: str


@dataclass
class DiffResult:
    """Complete diff scoring result."""
    overall_score: float
    dimensions: list[DimensionScore] = field(default_factory=list)
    summary: str = ""
    clean_diff: str = ""


class AstDiffer:
    """
    Compares two code snippets structurally and qualitatively.

    Usage:
        differ = AstDiffer()
        result = differ.compare(original_code, user_code)
    """

    # Node type categories for structural comparison
    CONTROL_FLOW_NODES = {
        ast.If, ast.While, ast.For, ast.Try, ast.With,
        ast.AsyncFor, ast.AsyncWith,
        ast.Match,  # Python 3.10+
    }
    FUNCTION_DEF_NODES = {ast.FunctionDef, ast.AsyncFunctionDef}
    CLASS_DEF_NODES = {ast.ClassDef}
    LOOP_NODES = {ast.For, ast.While, ast.AsyncFor}
    RETURN_NODES = {ast.Return, ast.Yield, ast.Raise}

    def compare(self, original: str, updated: str, language: str = "python") -> DiffResult:
        """
        Compare two code strings and return a scored diff result.

        Args:
            original: The original (AI-generated) solution code.
            updated: The user's rebuilt solution code.
            language: Programming language (only "python" supported for AST analysis).

        Returns:
            A DiffResult with overall score, dimension scores, summary, and clean diff.
        """
        # Fast path: identical strings = perfect score
        if original == updated:
            dims = [
                DimensionScore("Structural similarity", 1.0, "Code is byte-identical to the original."),
                DimensionScore("Correctness", 1.0, "Code is identical — same logic and edge cases."),
                DimensionScore("Readability", 1.0, "Code is identical — same readability characteristics."),
                DimensionScore("Simplicity", 1.0, "Code is identical — same complexity characteristics."),
            ]
            return DiffResult(
                overall_score=1.0,
                dimensions=dims,
                summary="Perfect rebuild — code is identical to the original.",
                clean_diff="",
            )

        if language != "python":
            return self._fallback_text_diff(original, updated)

        original_ast = self._parse_safe(original)
        updated_ast = self._parse_safe(updated)

        if original_ast is None or updated_ast is None:
            # Fall back to text diff if either code can't be parsed
            return self._fallback_text_diff(original, updated)

        dimensions = [
            self._score_structural(original_ast, updated_ast),
            self._score_correctness(original, updated, original_ast, updated_ast),
            self._score_readability_comparative(original, updated),
            self._score_simplicity_comparative(original, updated, original_ast, updated_ast),
        ]

        weights = {"Structural similarity": 0.40, "Correctness": 0.30, "Readability": 0.15, "Simplicity": 0.15}
        overall_score = sum(d.score * weights[d.dimension] for d in dimensions)

        clean_diff = self._generate_unified_diff(original, updated)
        summary = self._generate_summary(overall_score, dimensions, original, updated)

        return DiffResult(
            overall_score=round(overall_score, 2),
            dimensions=dimensions,
            summary=summary,
            clean_diff=clean_diff,
        )

    # ------------------------------------------------------------------
    # Structural scoring
    # ------------------------------------------------------------------

    def _score_structural(self, original: ast.AST, updated: ast.AST) -> DimensionScore:
        """
        Compare AST structure: function/class definitions, control flow,
        loops, returns, and overall node distribution.
        """
        orig_stats = self._count_nodes(original)
        upd_stats = self._count_nodes(updated)

        if orig_stats["total"] == 0 and upd_stats["total"] == 0:
            return DimensionScore("Structural similarity", 1.0, "Both solutions are empty.")

        # Compare individual categories
        scores = []
        for category in ("functions", "classes", "control_flow", "loops", "returns"):
            o_count = orig_stats.get(category, 0)
            u_count = upd_stats.get(category, 0)
            if o_count == 0 and u_count == 0:
                cat_score = 1.0
            elif o_count == 0 or u_count == 0:
                cat_score = 0.0
            else:
                cat_score = 1.0 - abs(o_count - u_count) / max(o_count, u_count)
            scores.append(cat_score)

        # Compare total node count similarity
        total_ratio = min(orig_stats["total"], upd_stats["total"]) / max(orig_stats["total"], upd_stats["total"], 1)

        avg_score = (sum(scores) / len(scores)) * 0.6 + total_ratio * 0.4
        final_score = min(max(avg_score, 0.0), 1.0)

        explanation = self._structural_explanation(orig_stats, upd_stats, final_score)
        return DimensionScore("Structural similarity", round(final_score, 2), explanation)

    def _count_nodes(self, tree: ast.AST) -> dict:
        """Count AST node categories in a parsed tree."""
        stats: dict = {
            "total": 0, "functions": 0, "classes": 0,
            "control_flow": 0, "loops": 0, "returns": 0,
        }
        for node in ast.walk(tree):
            stats["total"] += 1
            if type(node) in self.FUNCTION_DEF_NODES:
                stats["functions"] += 1
            elif type(node) in self.CLASS_DEF_NODES:
                stats["classes"] += 1
            if type(node) in self.CONTROL_FLOW_NODES:
                stats["control_flow"] += 1
            if type(node) in self.LOOP_NODES:
                stats["loops"] += 1
            if type(node) in self.RETURN_NODES:
                stats["returns"] += 1
        return stats

    def _structural_explanation(self, orig: dict, upd: dict, score: float) -> str:
        """Generate human explanation for structural score."""
        parts = []
        if orig["functions"] == upd["functions"]:
            parts.append(f"same number of functions ({orig['functions']})")
        else:
            parts.append(f"functions: {orig['functions']} vs {upd['functions']}")

        if orig["classes"] == upd["classes"]:
            parts.append(f"same classes ({orig['classes']})")
        else:
            parts.append(f"classes: {orig['classes']} vs {upd['classes']}")

        parts.append(f"control flow nodes: {orig['control_flow']} vs {upd['control_flow']}")
        parts.append(f"total nodes: {orig['total']} vs {upd['total']}")

        return f"Structural score {score:.0%}. " + ", ".join(parts) + "."

    # ------------------------------------------------------------------
    # Correctness scoring
    # ------------------------------------------------------------------

    def _score_correctness(
        self, original: str, updated: str,
        original_ast: ast.AST, updated_ast: ast.AST,
    ) -> DimensionScore:
        """
        Score correctness by comparing function signatures, return statements,
        and key identifiers (function names, variable names) between versions.

        Uses fuzzy matching on function names and parameter counts so that
        renamed functions (e.g. 'find_max' → 'find_maximum') don't penalize.
        """
        # Compare function names with fuzzy matching
        orig_funcs = {
            node.name: node for node in ast.walk(original_ast)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        upd_funcs = {
            node.name: node for node in ast.walk(updated_ast)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

        if not orig_funcs and not upd_funcs:
            func_score = 1.0
            details = ["No functions to compare."]
        elif not orig_funcs or not upd_funcs:
            func_score = 0.3  # Some functions exist in one but not the other
            details = ["Function count mismatch."]
        else:
            # Use fuzzy matching on function names with proper bipartite matching
            # Each updated function can match at most one original function
            matched_pairs = []
            matched_orig_names = set()
            available_upd = dict(upd_funcs)

            for o_name, o_node in orig_funcs.items():
                best_score = 0.0
                best_u_name = None
                for u_name, u_node in available_upd.items():
                    name_sim = difflib.SequenceMatcher(None, o_name, u_name).ratio()
                    # Compare parameter counts
                    o_params = len(o_node.args.args) if hasattr(o_node.args, 'args') else 0
                    u_params = len(u_node.args.args) if hasattr(u_node.args, 'args') else 0
                    param_sim = 1.0 if o_params == u_params else (0.5 if abs(o_params - u_params) <= 1 else 0.2)
                    combined = name_sim * 0.7 + param_sim * 0.3
                    if combined > best_score:
                        best_score = combined
                        best_u_name = u_name

                if best_u_name:
                    matched_pairs.append(best_score)
                    matched_orig_names.add(o_name)
                    del available_upd[best_u_name]  # Remove to prevent duplicate matching
                # else: no match found for this original function — contributes 0

            func_score = sum(matched_pairs) / max(len(orig_funcs), 1)

            matched_upd_names = set(upd_funcs.keys()) - set(available_upd.keys())
            only_orig_names = set(orig_funcs.keys()) - matched_orig_names
            only_upd_names = set(upd_funcs.keys()) - matched_upd_names
            details = []
            if matched_upd_names:
                details.append(f"matched {len(matched_upd_names)} function(s)")
            if only_orig_names:
                details.append(f"original-only: {', '.join(sorted(only_orig_names))}")
            if only_upd_names:
                details.append(f"rebuild-only: {', '.join(sorted(only_upd_names))}")

        # Check for common correctness patterns
        has_except_orig = "except" in original
        has_except_upd = "except" in updated
        has_none_check_orig = "is None" in original or "is not None" in original
        has_none_check_upd = "is None" in updated or "is not None" in updated
        has_type_check_orig = "isinstance" in original or "type(" in original
        has_type_check_upd = "isinstance" in updated or "type(" in updated

        # Check if rebuild handles same conditionals (if statements) as original
        orig_ifs = len([n for n in ast.walk(original_ast) if isinstance(n, ast.If)])
        upd_ifs = len([n for n in ast.walk(updated_ast) if isinstance(n, ast.If)])
        has_if_orig = orig_ifs > 0
        has_if_upd = upd_ifs > 0

        edge_case_matches = 0
        edge_case_total = 0

        if has_except_orig or has_except_upd:
            edge_case_total += 1
            if has_except_orig == has_except_upd:
                edge_case_matches += 1

        if has_none_check_orig or has_none_check_upd:
            edge_case_total += 1
            if has_none_check_orig == has_none_check_upd:
                edge_case_matches += 1

        if has_type_check_orig or has_type_check_upd:
            edge_case_total += 1
            if has_type_check_orig == has_type_check_upd:
                edge_case_matches += 1

        # If original has conditionals but rebuild doesn't, penalize
        if has_if_orig and not has_if_upd:
            edge_case_total += 1
            # Not a match — rebuild skipped a conditional branch

        edge_score = edge_case_matches / max(edge_case_total, 1)

        # Check for completeness: rebuild with significantly fewer AST nodes
        # than the original suggests incomplete implementation
        orig_nodes = sum(1 for _ in ast.walk(original_ast))
        upd_nodes = sum(1 for _ in ast.walk(updated_ast))
        node_ratio = upd_nodes / max(orig_nodes, 1)
        # Penalize if rebuild has less than 40% of original's node count
        completeness_penalty = 0.0
        if node_ratio < 0.4:
            completeness_penalty = 0.3 * (1 - node_ratio)

        # Final score: 55% function interface, 35% edge case handling, 10% completeness
        final_score = func_score * 0.55 + edge_score * 0.35 + min(node_ratio, 1.0) * 0.10
        final_score = max(0.0, final_score - completeness_penalty)

        detail_str = "; ".join(details) if details else "Same interface detected."
        return DimensionScore(
            "Correctness",
            round(final_score, 2),
            f"Correctness score {final_score:.0%}. {detail_str}",
        )

    # ------------------------------------------------------------------
    # Readability scoring (comparative)
    # ------------------------------------------------------------------

    def _score_readability_comparative(self, original: str, updated: str) -> DimensionScore:
        """
        Compare readability metrics between original and rebuilt code.

        Measures how similar the two versions are in terms of identifier
        quality, commenting patterns, and indentation consistency.
        """
        orig_metrics = self._readability_metrics(original)
        upd_metrics = self._readability_metrics(updated)

        # Compare average identifier length similarity
        id_sim = 1.0 - abs(orig_metrics["avg_id_len"] - upd_metrics["avg_id_len"]) / max(orig_metrics["avg_id_len"], upd_metrics["avg_id_len"], 1)
        id_sim = max(0.0, min(1.0, id_sim))

        # Compare comment ratio similarity
        cr_sim = 1.0 - abs(orig_metrics["comment_ratio"] - upd_metrics["comment_ratio"]) / max(orig_metrics["comment_ratio"], upd_metrics["comment_ratio"], 0.01)
        cr_sim = max(0.0, min(1.0, cr_sim))

        # Compare indentation consistency
        indent_sim = 1.0 if orig_metrics["indent_count"] == upd_metrics["indent_count"] else 0.5

        final_score = id_sim * 0.4 + cr_sim * 0.4 + indent_sim * 0.2

        details = [
            f"avg identifier length: {orig_metrics['avg_id_len']:.1f} → {upd_metrics['avg_id_len']:.1f}",
        ]
        if orig_metrics["comment_lines"] > 0 or upd_metrics["comment_lines"] > 0:
            details.append(f"comment ratio: {orig_metrics['comment_ratio']:.0%} → {upd_metrics['comment_ratio']:.0%}")

        return DimensionScore("Readability", round(final_score, 2), "; ".join(details))

    @staticmethod
    def _readability_metrics(code: str) -> dict:
        """Extract readability metrics from a code string."""
        lines = code.split("\n")
        non_empty = [l for l in lines if l.strip()]

        identifiers = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b', code)
        avg_id_len = sum(len(i) for i in identifiers) / max(len(identifiers), 1) if identifiers else 0

        comment_lines = len([l for l in lines if l.strip().startswith("#")])
        comment_ratio = comment_lines / max(len(non_empty), 1)

        indent_patterns = set()
        for l in non_empty:
            stripped = l.lstrip()
            if stripped and l != stripped:
                indent = l[: len(l) - len(stripped)]
                indent_patterns.add(indent)

        return {
            "avg_id_len": avg_id_len,
            "comment_lines": comment_lines,
            "comment_ratio": comment_ratio,
            "indent_count": len(indent_patterns),
        }

    # ------------------------------------------------------------------
    # Simplicity scoring (comparative)
    # ------------------------------------------------------------------

    def _score_simplicity_comparative(
        self, original: str, updated: str,
        original_ast: ast.AST, updated_ast: ast.AST,
    ) -> DimensionScore:
        """
        Compare complexity metrics between original and rebuilt code.

        Measures how similar the two versions are in terms of line length,
        nesting depth, and verbosity patterns.
        """
        orig_metrics = self._simplicity_metrics(original, original_ast)
        upd_metrics = self._simplicity_metrics(updated, updated_ast)

        # Compare average line length similarity
        ll_sim = 1.0 - abs(orig_metrics["avg_line_len"] - upd_metrics["avg_line_len"]) / max(orig_metrics["avg_line_len"], upd_metrics["avg_line_len"], 1)
        ll_sim = max(0.0, min(1.0, ll_sim))

        # Compare nesting depth similarity
        nd_sim = 1.0 - abs(orig_metrics["max_depth"] - upd_metrics["max_depth"]) / max(orig_metrics["max_depth"], upd_metrics["max_depth"], 1)
        nd_sim = max(0.0, min(1.0, nd_sim))

        final_score = ll_sim * 0.5 + nd_sim * 0.5

        details = [
            f"avg line length: {orig_metrics['avg_line_len']:.0f} → {upd_metrics['avg_line_len']:.0f}",
            f"max nesting depth: {orig_metrics['max_depth']} → {upd_metrics['max_depth']}",
        ]

        return DimensionScore("Simplicity", round(final_score, 2), "; ".join(details))

    def _simplicity_metrics(self, code: str, tree: ast.AST) -> dict:
        """Extract simplicity metrics from code string and AST."""
        lines = [l for l in code.split("\n") if l.strip()]
        avg_line_len = sum(len(l) for l in lines) / max(len(lines), 1)
        max_depth = self._max_nesting_depth(tree)
        return {"avg_line_len": avg_line_len, "max_depth": max_depth}

    @staticmethod
    def _max_nesting_depth(node: ast.AST, current_depth: int = 0) -> int:
        """Recursively compute maximum nesting depth of an AST."""
        max_depth = current_depth
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.Try, ast.With, ast.AsyncFor, ast.AsyncWith)):
                child_depth = AstDiffer._max_nesting_depth(child, current_depth + 1)
            else:
                child_depth = AstDiffer._max_nesting_depth(child, current_depth)
            max_depth = max(max_depth, child_depth)
        return max_depth

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_safe(code: str) -> Optional[ast.AST]:
        """Safely parse code into AST, returning None on failure."""
        try:
            return ast.parse(code)
        except SyntaxError:
            return None

    def _generate_unified_diff(self, original: str, updated: str) -> str:
        """Generate a text-based unified diff for display in the UI."""
        orig_lines = original.splitlines(keepends=True)
        upd_lines = updated.splitlines(keepends=True)
        diff = list(difflib.unified_diff(
            orig_lines, upd_lines,
            fromfile="original", tofile="rebuild",
            lineterm="",
        ))
        return "".join(diff)

    def _generate_summary(self, overall: float, dimensions: list[DimensionScore], original: str, updated: str) -> str:
        """Generate a human-readable summary of the diff results."""
        if overall >= 0.9:
            verdict = "Excellent rebuild! Nearly identical in structure and quality."
        elif overall >= 0.75:
            verdict = "Great rebuild. Minor differences in style or approach."
        elif overall >= 0.6:
            verdict = "Good rebuild with some differences in approach or structure."
        elif overall >= 0.4:
            verdict = "Adequate rebuild. The solution works but differs significantly from the original."
        else:
            verdict = "Significant differences. Review the original solution and try again."

        weak_areas = [d for d in dimensions if d.score < 0.6]
        if weak_areas:
            areas = ", ".join(d.dimension for d in weak_areas)
            verdict += f" Focus on improving: {areas}."

        return verdict

    def _fallback_text_diff(self, original: str, updated: str) -> DiffResult:
        """
        Fallback for non-Python languages — use text-based similarity via
        SequenceMatcher instead of AST comparison.
        """
        ratio = difflib.SequenceMatcher(None, original, updated).ratio()
        clean_diff = self._generate_unified_diff(original, updated)

        dims = [
            DimensionScore("Structural similarity", round(ratio, 2), "Text-based similarity (AST not available for this language)."),
            DimensionScore("Correctness", 0.5, "Cannot assess correctness for non-Python code — manual review recommended."),
            DimensionScore("Readability", 0.5, "Cannot assess readability for non-Python code."),
            DimensionScore("Simplicity", 0.5, "Cannot assess simplicity for non-Python code."),
        ]

        return DiffResult(
            overall_score=round(ratio, 2),
            dimensions=dims,
            summary=f"Text-based similarity: {ratio:.0%}. Language is not Python — AST analysis unavailable.",
            clean_diff=clean_diff,
        )


# Module-level singleton
differ = AstDiffer()
