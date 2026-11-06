"""Build the root single-file release using only Python's standard library."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'src'

def build():
    html = (SRC / 'index.html').read_text()
    css = (SRC / 'styles.css').read_text()
    data = {name: json.loads((SRC / 'data' / f'{name}.json').read_text())
            for name in ('units', 'exercises', 'book')}
    modules = ['flashcards', 'hints', 'core', 'notebook', 'progress', 'store', 'app']
    code = []
    for name in modules:
        text = (SRC / f'{name}.js').read_text()
        text = re.sub(r'^import .+?;\s*$', '', text, flags=re.M)
        text = re.sub(r'\bexport (?=(?:const|function|async function|class)\b)', '', text)
        code.append(text)
    js = 'globalThis.ENGLISH11_DATA=' + json.dumps(data, ensure_ascii=False) + ';\n' + '\n'.join(code)
    js = re.sub(r'</script', r'<\\/script', js, flags=re.I)
    html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
    html = html.replace('<script type="module" src="app.js"></script>', '<script type="module">\n' + js + '\n</script>')
    (ROOT / 'index.html').write_text(html)
    print(f'Built index.html ({len(html.encode()):,} bytes; {len(data["exercises"])} exercises)')

if __name__ == '__main__':
    build()
