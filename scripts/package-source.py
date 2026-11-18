"""Build the downloadable Pages project, excluding hosting identity and the archive itself."""
from pathlib import Path
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
archive = dist / "character-scene-prompt-workshop.zip"
for name in ("README.md", "EXAMPLES.md"):
    shutil.copyfile(root / name, dist / name)
files = [root / name for name in ("README.md", "EXAMPLES.md", "package.json", "package-lock.json", ".gitignore")]
for directory in ("dist", "tests", "scripts", ".github"):
    files.extend(p for p in (root / directory).rglob("*") if p.is_file() and p != archive)
with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
    for path in sorted(files):
        bundle.write(path, path.relative_to(root))
print(archive.name, archive.stat().st_size, "bytes")

