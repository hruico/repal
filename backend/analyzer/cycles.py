def find_cycles(edges: list[dict]) -> set[str]:
    """Return set of file IDs that participate in at least one cycle."""
    graph: dict[str, list[str]] = {}
    for e in edges:
        graph.setdefault(e['source'], []).append(e['target'])

    visited: set[str] = set()
    rec_stack: set[str] = set()
    in_cycle: set[str] = set()

    def dfs(node: str, path: list[str]):
        visited.add(node)
        rec_stack.add(node)
        path.append(node)
        for nb in graph.get(node, []):
            if nb not in visited:
                dfs(nb, path)
            elif nb in rec_stack:
                idx = path.index(nb)
                in_cycle.update(path[idx:])
        path.pop()
        rec_stack.discard(node)

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node, [])

    return in_cycle
