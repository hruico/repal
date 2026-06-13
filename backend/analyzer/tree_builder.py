import os


def build_tree(root_path: str, files: list[dict]) -> dict:
    """Convert flat file list into nested folder-tree dict."""
    tree = {'name': os.path.basename(root_path), 'type': 'dir', 'children': []}

    for file_meta in sorted(files, key=lambda f: f['id']):
        parts = file_meta['id'].split('/')
        node = tree
        for part in parts[:-1]:
            found = next(
                (c for c in node['children'] if c['name'] == part and c['type'] == 'dir'),
                None
            )
            if not found:
                found = {'name': part, 'type': 'dir', 'children': []}
                node['children'].append(found)
            node = found
        node['children'].append({
            'name': parts[-1],
            'type': 'file',
            'id': file_meta['id'],
            'extension': file_meta['extension'],
        })

    return tree
