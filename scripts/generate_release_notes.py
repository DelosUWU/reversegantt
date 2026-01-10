#!/usr/bin/env python3

import os
import sys
import subprocess
import re
from typing import List, Dict
from datetime import datetime


PATTERNS = {
    "feature": [r"^(feat|feature)[:\s]", r"add", r"new"],
    "fix": [r"^(fix|bugfix)[:\s]", r"fix", r"bug"],
    "docs": [r"^(doc|docs)[:\s]", r"documentation"],
    "refactor": [r"^(refactor|ref)[:\s]", r"refactor"],
    "test": [r"^(test|tests)[:\s]", r"test"],
    "chore": [r"^(chore|ci|cd)[:\s]", r"ci/cd"],
}


def get_commits_between_tags(from_tag: str = None, to_tag: str = None) -> List[str]:
    """
    Получает список коммитов между двумя тегами
    Если from_tag не указан, берется предыдущий тег
    Если to_tag не указан, берется HEAD
    """
    try:
        if from_tag and to_tag:
            cmd = ["git", "log", "--pretty=format:%H|%s|%an|%ae", f"{from_tag}..{to_tag}"]
        elif from_tag:
            cmd = ["git", "log", "--pretty=format:%H|%s|%an|%ae", f"{from_tag}..HEAD"]
        else:
            # Получаем последний тег
            result = subprocess.run(
                ["git", "describe", "--tags", "--abbrev=0"],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0:
                last_tag = result.stdout.strip()
                cmd = ["git", "log", "--pretty=format:%H|%s|%an|%ae", f"{last_tag}..HEAD"]
            else:
                # Если тегов нет, берем все коммиты
                cmd = ["git", "log", "--pretty=format:%H|%s|%an|%ae"]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        commits = []
        for line in result.stdout.strip().split("\n"):
            if line:
                parts = line.split("|", 3)
                if len(parts) >= 3:
                    commits.append({
                        "hash": parts[0],
                        "message": parts[1],
                        "author": parts[2] if len(parts) > 2 else "Unknown",
                        "email": parts[3] if len(parts) > 3 else ""
                    })
        return commits
    except subprocess.CalledProcessError as e:
        print(f"Error getting commits: {e}", file=sys.stderr)
        return []


def categorize_commit(message: str) -> str:

    message_lower = message.lower()

    for category, patterns in PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, message_lower):
                return category

    return "other"


def generate_release_notes(commits: List[Dict], version: str) -> str:
    """Генерирует release notes в Markdown формате"""
    if not commits:
        return f"# Release {version}\n\nNo changes in this release.\n"


    categorized = {}
    for commit in commits:
        category = categorize_commit(commit["message"])
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(commit)


    notes = f"# Release {version}\n\n"
    notes += f"**Release Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
    notes += f"**Total Changes:** {len(commits)} commits\n\n"


    category_order = ["feature", "fix", "refactor", "docs", "test", "chore", "other"]
    category_titles = {
        "feature": "✨ New Features",
        "fix": "🐛 Bug Fixes",
        "refactor": "♻️ Code Refactoring",
        "docs": "📚 Documentation",
        "test": "🧪 Tests",
        "chore": "🔧 Chores & CI/CD",
        "other": "📦 Other Changes"
    }

    for category in category_order:
        if category in categorized:
            notes += f"## {category_titles.get(category, category.title())}\n\n"
            for commit in categorized[category]:
                short_hash = commit["hash"][:7]
                notes += f"- {commit['message']} ({short_hash})\n"
            notes += "\n"


    authors = set(commit["author"] for commit in commits)
    if authors:
        notes += "## 👥 Contributors\n\n"
        for author in sorted(authors):
            notes += f"- {author}\n"
        notes += "\n"

    return notes


def main():
    """Главная функция"""

    version = os.environ.get("CI_COMMIT_TAG", os.environ.get("VERSION", "1.0.0"))


    from_tag = os.environ.get("PREVIOUS_TAG")
    to_tag = os.environ.get("CI_COMMIT_TAG", "HEAD")

    print(f"Generating release notes for version {version}...")
    print(f"From: {from_tag or 'beginning'}")
    print(f"To: {to_tag}")


    commits = get_commits_between_tags(from_tag, to_tag if to_tag != "HEAD" else None)
    print(f"Found {len(commits)} commits")


    release_notes = generate_release_notes(commits, version)


    output_file = os.environ.get("RELEASE_NOTES_FILE", "RELEASE_NOTES.md")

    if output_file == "-":
        print(release_notes)
    else:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(release_notes)
        print(f"Release notes written to {output_file}")

    return 0


if __name__ == "__main__":
    sys.exit(main())