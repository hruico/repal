from radon.complexity import cc_visit
from radon.raw import analyze


def calculate_metrics(file_meta: dict) -> dict:
    try:
        with open(file_meta['path'], 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        return {'loc': 0, 'complexity': None}

    loc = content.count('\n') + 1
    complexity = None

    if file_meta['extension'] == '.py':
        try:
            raw = analyze(content)
            loc = raw.lloc
            blocks = cc_visit(content)
            if blocks:
                complexity = round(
                    sum(b.complexity for b in blocks) / len(blocks), 2
                )
        except Exception:
            pass

    return {'loc': loc, 'complexity': complexity}
