#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
BOOTSTRAP_PATH = ROOT_DIR / "supabase/bootstrap.sql"
OUTPUT_PATH = ROOT_DIR / "supabase/migrations/20260422000000_initial_foundation.sql"
INCLUDE_PATTERN = re.compile(r"^\\i '([^']+)'$")


def iter_bootstrap_paths() -> list[Path]:
    paths: list[Path] = []
    for raw_line in BOOTSTRAP_PATH.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("\\set") or line.startswith("\\echo"):
            continue
        match = INCLUDE_PATTERN.match(line)
        if not match:
            raise ValueError(f"Unsupported bootstrap directive: {raw_line}")
        include_path = (ROOT_DIR / match.group(1)).resolve()
        if not include_path.is_file():
            raise FileNotFoundError(f"Missing included SQL file: {include_path}")
        paths.append(include_path)
    return paths


def normalize_sql(path: Path) -> str:
    filtered_lines: list[str] = []
    for raw_line in path.read_text().splitlines():
        stripped = raw_line.lstrip()
        if stripped.startswith("\\set") or stripped.startswith("\\echo"):
            continue
        filtered_lines.append(raw_line)
    return "\n".join(filtered_lines).strip()


def main() -> None:
    output_chunks = [
        "-- Initial canonical foundation rollout for Supabase live environments.",
        "-- Purpose: initialize a blank staging or production project with the current verified foundation.",
        "-- Rollout assumptions: the target database is a fresh Supabase project with no prior app schema history.",
        "-- Verification: CI replays this migration path on a blank local stack and runs public app smoke tests before deploy.",
        "",
    ]

    for include_path in iter_bootstrap_paths():
        relative_path = include_path.relative_to(ROOT_DIR).as_posix()
        sql_body = normalize_sql(include_path)
        output_chunks.append(f"-- BEGIN {relative_path}")
        if sql_body:
            output_chunks.append(sql_body)
        output_chunks.append(f"-- END {relative_path}")
        output_chunks.append("")

    OUTPUT_PATH.write_text("\n".join(output_chunks).rstrip() + "\n")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()
