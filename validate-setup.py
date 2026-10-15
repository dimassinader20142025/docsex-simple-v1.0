#!/usr/bin/env python3
"""
Docsexprime Setup Validator
Checks configuration and environment before starting the server
"""

import os
import sys
import sqlite3
from pathlib import Path

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")

def print_status(icon, message):
    print(f"{icon} {message}")

def check_python_version():
    """Verify Python 3.9+"""
    print_header("Python Version")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 9:
        print_status("✅", f"Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_status("❌", f"Python 3.9+ required, got {version.major}.{version.minor}")
        return False

def check_dependencies():
    """Verify required packages"""
    print_header("Dependencies")
    required = ["fastapi", "uvicorn", "pydantic", "dotenv"]
    all_ok = True
    
    for package in required:
        try:
            __import__(package.replace("-", "_"))
            print_status("✅", f"{package}")
        except ImportError:
            print_status("❌", f"{package} (not installed)")
            all_ok = False
    
    if not all_ok:
        print_status("ℹ️", "Run: pip install -r requirements.txt")
    
    return all_ok

def check_database():
    """Verify database connectivity"""
    print_header("Database")
    articles_db = os.environ.get("ARTICLES_DB", "articles.db")
    if not os.path.isabs(articles_db):
        articles_db = os.path.join(os.getcwd(), articles_db)
    
    try:
        conn = sqlite3.connect(articles_db)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if "articles" in tables and "admin_tokens" in tables:
            print_status("✅", f"Database at {articles_db}")
            print_status("ℹ️", f"Found tables: articles, admin_tokens")
            
            # Count articles
            conn = sqlite3.connect(articles_db)
            count = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
            conn.close()
            print_status("ℹ️", f"Articles in database: {count}")
            return True
        else:
            print_status("⚠️", f"Missing tables in {articles_db}")
            print_status("ℹ️", "Tables will be created automatically on first run")
            return True
    except Exception as e:
        print_status("❌", f"Database error: {e}")
        return False

def check_environment():
    """Check environment variables"""
    print_header("Environment Variables")
    
    config = {
        "PORT": ("8080", False),
        "HOST": ("0.0.0.0", False),
        "ADMIN_USER": ("admin", False),
        "ADMIN_PASSWORD": ("admin", False),
        "LLM_API_KEY": (None, True),  # Optional
        "LLM_BASE_URL": (None, True),  # Optional
        "LLM_MODEL": (None, True),  # Optional
    }
    
    all_ok = True
    llm_configured = False
    
    for key, (default, optional) in config.items():
        value = os.environ.get(key, default)
        if value:
            if "PASSWORD" in key or "KEY" in key:
                display = value[:5] + "***" if len(value) > 5 else "***"
            else:
                display = value
            print_status("✅", f"{key} = {display}")
            if key == "LLM_API_KEY":
                llm_configured = True
        else:
            if optional:
                print_status("ℹ️", f"{key} = (not set, LLM disabled)")
            else:
                print_status("❌", f"{key} = (missing, using default: {default})")
                all_ok = False
    
    return True  # Environment checks don't fail setup

def check_files():
    """Verify required files exist"""
    print_header("Required Files")
    required_files = [
        "index.html",
        "admin.html",
        "app.js",
        "admin.js",
        "styles.css",
        "server.py",
        "requirements.txt"
    ]
    
    all_ok = True
    for filename in required_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print_status("✅", f"{filename} ({size:,} bytes)")
        else:
            print_status("❌", f"{filename} (missing)")
            all_ok = False
    
    return all_ok

def check_directories():
    """Verify required directories"""
    print_header("Directories")
    directories = [
        ("uploads", "Media uploads directory"),
        (".venv", "Python virtual environment (optional)"),
    ]
    
    for dirname, description in directories:
        if os.path.isdir(dirname):
            print_status("✅", f"{dirname}/ - {description}")
        else:
            print_status("ℹ️", f"{dirname}/ - {description} (will be created)")

def print_summary(results):
    """Print validation summary"""
    print_header("Validation Summary")
    
    checks = [
        ("Python Version", results.get("python", False)),
        ("Dependencies", results.get("dependencies", False)),
        ("Database", results.get("database", False)),
        ("Required Files", results.get("files", False)),
    ]
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    for name, result in checks:
        icon = "✅" if result else "❌"
        print_status(icon, name)
    
    print(f"\n{passed}/{total} checks passed\n")
    
    if passed == total:
        print_status("✅", "Your setup looks good! Ready to start the server.")
        print_status("ℹ️", "Run: python -m uvicorn server:app --host 0.0.0.0 --port 8080")
        return True
    else:
        print_status("❌", "Please fix the issues above before starting the server.")
        return False

def main():
    print("\n🔍 Docsexprime Setup Validator\n")
    
    results = {
        "python": check_python_version(),
        "dependencies": check_dependencies(),
        "database": check_database(),
        "files": check_files(),
    }
    
    check_environment()
    check_directories()
    
    success = print_summary(results)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
