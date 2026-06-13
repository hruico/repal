import ast
import re
import os


def get_dependencies(file_meta: dict, all_files: list[dict]) -> list[str]:
    ext = file_meta['extension']
    try:
        with open(file_meta['path'], 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        return []

    if ext == '.py':
        raw = _parse_python(content)
    elif ext in {'.js', '.ts', '.jsx', '.tsx'}:
        raw = _parse_js(content)
    elif ext in {'.c', '.cpp', '.h'}:
        raw = _parse_c(content)
    elif ext == '.java':
        raw = _parse_java(content)
    elif ext == '.go':
        raw = _parse_go(content)
    elif ext == '.rs':
        raw = _parse_rust(content)
    else:
        raw = []

    return _resolve(raw, file_meta, all_files)


def _parse_python(content: str) -> list[str]:
    imports = []
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name.replace('.', '/'))
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module.replace('.', '/'))
    except SyntaxError:
        pass
    return imports


def _parse_js(content: str) -> list[str]:
    pattern = r"""(?:import\s+.*?\s+from\s+|require\s*\(\s*)['"]([^'"]+)['"]"""
    return re.findall(pattern, content)


def _parse_c(content: str) -> list[str]:
    # Local includes only — skips system headers like <stdio.h>
    return re.findall(r'#include\s+"([^"]+)"', content)


def _resolve(raw: list[str], source: dict, all_files: list[dict]) -> list[str]:
    resolved = []
    all_ids = {f['id'] for f in all_files}
    for imp in raw:
        imp_clean = imp.strip('./').strip('../')
        for file_id in all_ids:
            if file_id == source['id']:
                continue
            base = os.path.splitext(file_id)[0]
            if base.endswith(imp_clean) or file_id.endswith(imp_clean):
                resolved.append(file_id)
                break
    return resolved


def _parse_java(content: str) -> list[str]:
    # "import com.example.utils.Helper;" → "com/example/utils/Helper"
    return [
        m.replace('.', '/')
        for m in re.findall(r'^import\s+(?:static\s+)?([\w.]+);', content, re.MULTILINE)
    ]


def _parse_go(content: str) -> list[str]:
    singles = re.findall(r'import\s+"([^"]+)"', content)
    blocks  = re.findall(r'"([^"]+)"',
                         ''.join(re.findall(r'import\s*\(([^)]+)\)', content, re.DOTALL)))
    return singles + blocks


def _parse_rust(content: str) -> list[str]:
    uses = re.findall(r'^use\s+([\w:]+)', content, re.MULTILINE)
    mods = re.findall(r'^mod\s+(\w+)', content, re.MULTILINE)
    return [u.replace('::', '/') for u in uses] + mods
