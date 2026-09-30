import sys
def rep(path, old, new, count=1):
    s = open(path, encoding='utf8').read()
    n = s.count(old)
    if n != count:
        raise SystemExit(f'{path}: se esperaban {count} coincidencias y hay {n} para:\n{old[:120]}')
    s = s.replace(old, new)
    open(path, 'w', encoding='utf8', newline='\n').write(s)
