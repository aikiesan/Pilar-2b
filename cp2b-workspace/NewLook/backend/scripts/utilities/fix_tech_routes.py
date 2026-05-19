"""
Script to fix all technology_routes.py endpoints to use psycopg2 cursor pattern
"""
import re

# Read the file
with open('cp2b-workspace/NewLook/backend/app/routers/technology_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove SQLAlchemy imports
content = re.sub(r'from sqlalchemy\.orm import Session\n', '', content)
content = re.sub(r'from sqlalchemy import text\n', '', content)

# Fix all function signatures: remove db: Session = Depends(get_db) parameter
content = re.sub(
    r',\s*db: Session = Depends\(get_db\)',
    '',
    content
)

# Fix db.execute(...) calls to use cursor pattern
# Pattern 1: Simple execute with text() wrapper
content = re.sub(
    r'result = db\.execute\(text\((.*?)\), (.*?)\)',
    r'cursor.execute(\1, \2)',
    content,
    flags=re.DOTALL
)

# Pattern 2: Simple execute with text() wrapper, no params
content = re.sub(
    r'result = db\.execute\(text\((.*?)\)\)',
    r'cursor.execute(\1)',
    content,
    flags=re.DOTALL
)

# Pattern 3: Direct db.execute calls
content = re.sub(
    r'(\w+) = db\.execute\(text\((.*?)\), (.*?)\)',
    r'cursor.execute(\2, \3)\n    \1 = cursor',
    content,
    flags=re.DOTALL
)

# Fix db.commit() to conn.commit()
content = content.replace('db.commit()', 'conn.commit()')

# Fix db.rollback() to conn.rollback()
content = content.replace('db.rollback()', 'conn.rollback()')

# Write back
with open('cp2b-workspace/NewLook/backend/app/routers/technology_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed all technology_routes.py endpoints to use psycopg2 cursor pattern")
