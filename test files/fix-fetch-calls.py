#!/usr/bin/env python3
"""
AudioBook Organizer - Fix Fetch Calls Script

This script automatically updates the remaining fetch calls to use apiFetch
for proper production deployment.

Usage:
    python fix-fetch-calls.py
"""

import os
import re
from pathlib import Path

def fix_auth_js():
    """Fix fetch calls in auth.js"""
    file_path = Path('frontend/js/modules/auth.js')
    
    if not file_path.exists():
        print(f"❌ {file_path} not found")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Track changes
    changes_made = 0
    
    # Fix: fetch('/api/auth/init-user', {
    old_pattern = r'const response = await fetch\(\'/api/auth/init-user\', \{'
    new_pattern = r'const response = await apiFetch(\'/api/auth/init-user\', {'
    if old_pattern in content:
        content = re.sub(
            r'const response = await fetch\(\'/api/auth/init-user\', \{([^}]+)\}\);',
            lambda m: f'const response = await apiFetch(\'/api/auth/init-user\', {{{m.group(1)}}});',
            content
        )
        changes_made += 1
        print("✅ Fixed /api/auth/init-user fetch call")
    
    # Fix: fetch('/api/auth/login', {
    if "await fetch('/api/auth/login'," in content:
        content = re.sub(
            r'const response = await fetch\(\'/api/auth/login\', \{([^}]+)\}\);',
            lambda m: f'const response = await apiFetch(\'/api/auth/login\', {{{m.group(1)}}});',
            content
        )
        changes_made += 1
        print("✅ Fixed /api/auth/login fetch call")
    
    # Fix: fetch('/api/auth/status', {
    if "await fetch('/api/auth/status'," in content:
        content = re.sub(
            r'const response = await fetch\(\'/api/auth/status\', \{([^}]+)\}\);',
            lambda m: f'const response = await apiFetch(\'/api/auth/status\', {{{m.group(1)}}});',
            content
        )
        changes_made += 1
        print("✅ Fixed /api/auth/status fetch call")
    
    # Fix: fetch('/api/auth/credits', {
    if "await fetch('/api/auth/credits'," in content:
        content = re.sub(
            r'const response = await fetch\(\'/api/auth/credits\', \{([^}]+)\}\);',
            lambda m: f'const response = await apiFetch(\'/api/auth/credits\', {{{m.group(1)}}});',
            content
        )
        changes_made += 1
        print("✅ Fixed /api/auth/credits fetch call")
    
    # Check if apiFetch import is needed
    if 'import { apiFetch }' not in content and changes_made > 0:
        # Find the existing imports section
        import_match = re.search(r'(import.*?from.*?[\'"][^\'\"]*[\'"];?\s*\n)', content)
        if import_match:
            # Add apiFetch import after existing imports
            import_section = import_match.group(0)
            new_import = "import { apiFetch } from './api.js';\n"
            content = content.replace(import_section, import_section + new_import)
            print("✅ Added apiFetch import to auth.js")
        else:
            # Add at the beginning if no imports found
            content = "import { apiFetch } from './api.js';\n" + content
            print("✅ Added apiFetch import at beginning of auth.js")
    
    if changes_made > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Updated {file_path} with {changes_made} changes")
        return True
    else:
        print(f"ℹ️  No changes needed in {file_path}")
        return False

def fix_export_js():
    """Fix fetch calls in export.js"""
    file_path = Path('frontend/js/modules/export.js')
    
    if not file_path.exists():
        print(f"❌ {file_path} not found")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Track changes
    changes_made = 0
    
    # Fix: fetch(`/exports/${exportId}/metadata.json`)
    if "fetch(`/exports/${exportId}/metadata.json`)" in content:
        content = content.replace(
            "const response = await fetch(`/exports/${exportId}/metadata.json`);",
            "const response = await apiFetch(`/exports/${exportId}/metadata.json`);"
        )
        changes_made += 1
        print("✅ Fixed /exports/${exportId}/metadata.json fetch call")
    
    # Check if apiFetch import is needed
    if 'import { apiFetch }' not in content and changes_made > 0:
        # Find the existing imports section
        import_lines = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            if line.strip().startswith('import ') and ' from ' in line:
                import_lines.append(i)
        
        if import_lines:
            # Add after the last import
            last_import_line = max(import_lines)
            lines.insert(last_import_line + 1, "import { apiFetch } from './api.js';")
            content = '\n'.join(lines)
            print("✅ Added apiFetch import to export.js")
        else:
            # Add at the beginning
            content = "import { apiFetch } from './api.js';\n" + content
            print("✅ Added apiFetch import at beginning of export.js")
    
    if changes_made > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Updated {file_path} with {changes_made} changes")
        return True
    else:
        print(f"ℹ️  No changes needed in {file_path}")
        return False

def verify_fixes():
    """Verify that all fetch calls have been fixed"""
    print("\n🔍 Verifying fetch call fixes...")
    
    # Files to check
    files_to_check = [
        'frontend/js/modules/auth.js',
        'frontend/js/modules/export.js'
    ]
    
    remaining_issues = []
    
    for file_path in files_to_check:
        if not Path(file_path).exists():
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for API fetch calls that should use apiFetch
        api_fetch_pattern = r'fetch\([\'\"]/api/[^\'\"]*[\'\"]\s*,'
        matches = re.findall(api_fetch_pattern, content)
        
        if matches:
            remaining_issues.append(f"{file_path}: {len(matches)} remaining API fetch calls")
            for match in matches:
                print(f"  ⚠️  Found: {match}")
    
    if remaining_issues:
        print(f"\n⚠️  Remaining issues found:")
        for issue in remaining_issues:
            print(f"    {issue}")
        return False
    else:
        print("✅ All API fetch calls have been updated to use apiFetch!")
        return True

def main():
    print("🔧 Fixing remaining fetch calls for production deployment...")
    print("=" * 60)
    
    total_changes = 0
    
    # Fix auth.js
    print("\n📄 Checking auth.js...")
    if fix_auth_js():
        total_changes += 1
    
    # Fix export.js
    print("\n📄 Checking export.js...")
    if fix_export_js():
        total_changes += 1
    
    # Verify all fixes
    all_fixed = verify_fixes()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 FETCH CALL FIX SUMMARY")
    print("=" * 60)
    
    if total_changes > 0:
        print(f"✅ Fixed {total_changes} files")
        print("✅ Added apiFetch imports where needed")
        
        if all_fixed:
            print("🎉 All fetch calls have been updated for production!")
            print("\nNext steps:")
            print("1. git add .")
            print("2. git commit -m 'Fix fetch calls for production'")
            print("3. git push")
            print("4. Run: python deploy-setup.py --backend-url <your-url>")
        else:
            print("⚠️  Some issues may remain - check the verification above")
    else:
        print("ℹ️  No changes were needed - fetch calls are already correct!")
    
    print(f"\n💡 For complete deployment guide, see: PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md")

if __name__ == '__main__':
    main() 