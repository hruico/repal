import os

EXCLUDED_DIRS = {
    '.git', 'node_modules', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.idea', '.vscode', 'coverage', '.mypy_cache',
}
SUPPORTED_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx',
    '.cpp', '.c', '.h', '.java', '.go', '.rs',
}


def traverse_directory(root_path: str) -> list[dict]:
    files = []
    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_path).replace(os.sep, '/')
            files.append({
                'id': rel_path,
                'path': full_path,
                'relative_path': rel_path,
                'extension': ext,
                'filename': filename,
            })
    return files
