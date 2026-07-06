"""Read-only guard for incoming Cypher.

The authoritative defence is running queries inside a read transaction
(server rejects writes); this keyword scan is defence-in-depth and gives
clearer error messages for obvious write attempts.
"""
import re

_FORBIDDEN = re.compile(
    r"\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|FOREACH)\b"
    r"|\bLOAD\s+CSV\b"
    r"|\bUSING\s+PERIODIC\s+COMMIT\b"
    r"|\bdbms\."
    r"|\bapoc\.",
    re.IGNORECASE,
)


def assert_read_only(cypher: str) -> None:
    """Raise ValueError if the statement contains write clauses or forbidden procedures."""
    match = _FORBIDDEN.search(cypher)
    if match:
        raise ValueError(
            f"Only read-only Cypher is allowed; forbidden keyword: {match.group(0)}"
        )
