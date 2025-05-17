#!/usr/bin/env python3
"""sync_rules.py

Synchronise per-editor rule files from a single `agentic_rules.md`.

Run **with no arguments** to populate the three common editors:

* Windsurf:   `.windsurfrules`
* Codex:      `AGENTS.md`
* Cusror:     `.cusrorrules.mdc`

Usage
-----

```bash
python sync_rules.py                 # uses defaults
python sync_rules.py --dry-run       # preview only
python sync_rules.py --map cyclops:newrules.md   # override / add
```

Arguments
---------

* `--base PATH`           Source rules file (default `agentic_rules.md`)
* `--map EDITOR:DEST`     Map extra editors to destination paths; repeatable.
* `--dry-run`             Print would‑be outputs instead of writing.

Marker syntax inside `agentic_rules.md`
---------------------------------------

```
::only EDITOR1,EDITOR2
# …lines that apply only to those editors…
::end
```

Any content outside a `::only`/`::end` pair is shared across **all** editors.
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Set

# Default editors & their destination rule files
DEFAULT_ALIAS: dict[str, Path] = {
    "windsurf": Path(".windsurfrules"),
    "codex": Path("AGENTS.md"),
    "cusror": Path(".cusrorrules.mdc"),
}


def parse_base_file(base_path: Path) -> Dict[str, List[str]]:
    """Parse `agentic_rules.md` and return a mapping editor -> list(lines)."""
    ALL = "__ALL__"
    buckets: Dict[str, List[str]] = {ALL: []}
    current_editors: Set[str] = {ALL}

    with base_path.open("r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")

            if line.startswith("::only "):
                editors = {
                    e.strip() for e in line[len("::only "):].split(",") if e.strip()
                }
                if not editors:
                    raise ValueError(
                        f"No editors specified in directive at line: {line}"
                    )
                current_editors = editors
                for ed in editors:
                    buckets.setdefault(ed, [])
                continue

            if line.startswith("::end"):
                current_editors = {ALL}
                continue

            for ed in current_editors:
                buckets.setdefault(ed, []).append(line)

    return buckets


def build_outputs(
    buckets: Dict[str, List[str]], editor_aliases: Dict[str, Path]
) -> Dict[str, str]:
    ALL = "__ALL__"
    common_lines = buckets.get(ALL, [])

    outputs: Dict[str, str] = {}
    for editor, dest in editor_aliases.items():
        lines = common_lines + buckets.get(editor, [])
        outputs[editor] = "\n".join(lines).rstrip() + "\n"
    return outputs


def write_outputs(
    outputs: Dict[str, str],
    editor_aliases: Dict[str, Path],
    dry_run: bool = False,
) -> None:
    for editor, content in outputs.items():
        dest_path = editor_aliases[editor]
        if dry_run:
            print(f"----- {dest_path} (editor={editor}) -----\n{content}\n")
            continue
        dest_path.write_text(content, encoding="utf-8")
        print(f"Wrote {dest_path}")


def parse_map_args(map_args: List[str] | None) -> Dict[str, Path]:
    """Parse --map arguments into a dict."""
    if not map_args:
        return {}

    aliases: Dict[str, Path] = {}
    for mapping in map_args:
        try:
            editor, path = mapping.split(":", 1)
            editor = editor.strip()
            if not editor:
                raise ValueError
        except ValueError:
            raise argparse.ArgumentTypeError(
                f"Invalid --map value '{mapping}'. Expect EDITOR:PATH."
            )
        aliases[editor] = Path(path).expanduser()
    return aliases


def main(argv: List[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Sync per-editor rule files.")
    parser.add_argument(
        "--base",
        type=Path,
        default=Path("agentic_rules.md"),
        help="Source rules file (default agentic_rules.md)",
    )
    parser.add_argument(
        "--map",
        dest="maps",
        action="append",
        help="Mapping EDITOR:DEST_PATH. Repeat to add/override.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print would-be outputs instead of writing.",
    )
    args = parser.parse_args(argv)

    # Merge defaults with any user overrides/additions
    editor_aliases = DEFAULT_ALIAS | parse_map_args(args.maps)

    if not args.base.exists():
        sys.exit(f"Base file '{args.base}' not found.")

    try:
        buckets = parse_base_file(args.base)
    except ValueError as e:
        sys.exit(str(e))

    outputs = build_outputs(buckets, editor_aliases)
    write_outputs(outputs, editor_aliases, dry_run=args.dry_run)


if __name__ == "__main__":  # pragma: no cover
    main()
