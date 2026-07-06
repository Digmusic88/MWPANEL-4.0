#!/usr/bin/env node

/**
 * Safe Navigation Automated Replacement Script
 * 
 * This script automatically scans React/Vite frontend files for unsafe navigation patterns
 * and replaces them with Safe Navigation implementations using the safeNavigation utility.
 * 
 * Usage:
 *   node safe-navigation-replacer.js [options]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --verbose    Show detailed logging
 *   --help       Show help information
 * 
 * Example:
 *   node safe-navigation-replacer.js --dry-run --verbose
 *   node safe-navigation-replacer.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class SafeNavigationReplacer {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      rootPath: options.rootPath || '/opt/mw-panel/frontend',
      ...options
    };
    
    this.changes = [];
    this.patterns = [
      // Pattern 1: Direct navigate() calls without null checks
      {
        name: 'direct-navigate',
        regex: /navigate\s*\(\s*([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'safeNavigate(navigate, $1, $2)',
        import: "import { safeNavigate } from '@/utils/safeNavigation';"
      },
      
      // Pattern 2: Non-null assertions in Navigate components
      {
        name: 'non-null-assertion',
        regex: /getDashboardPath\([^!]+!\)/g,
        replacement: (match) => {
          return match.replace(/!\)/, ' || UserRole.STUDENT)');
        },
        import: "import { UserRole } from '@/types/user';"
      },
      
      // Pattern 3: Direct window.location usage
      {
        name: 'direct-window-location',
        regex: /window\.location\.href\s*=\s*([^;]+);/g,
        replacement: 'safeWindowNavigate($1)',
        import: "import { safeWindowNavigate } from '@/utils/safeNavigation';"
      },
      
      // Pattern 4: Unsafe user role navigation
      {
        name: 'unsafe-role-navigation',
        regex: /navigate\(\s*[`"']\/\${user\.role}[^`"']*[`"']\s*\)/g,
        replacement: (match) => {
          return match.replace(/navigate\(/, 'safeNavigateToUserPath(navigate, user, ').replace(/\)$/, ')');
        },
        import: "import { safeNavigateToUserPath } from '@/utils/safeNavigation';"
      },
      
      // Pattern 5: Unsafe conditional navigation
      {
        name: 'unsafe-conditional',
        regex: /(user\.role\s*&&\s*navigate\()/g,
        replacement: 'safeNavigate(navigate, ',
        import: "import { safeNavigate } from '@/utils/safeNavigation';"
      },
      
      // Pattern 6: useNavigate without import check
      {
        name: 'missing-safe-import',
        regex: /useNavigate\(\)/g,
        replacement: 'useNavigate()',
        checkForImport: true,
        import: "import { safeNavigate } from '@/utils/safeNavigation';"
      }
    ];
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  async scanFiles() {
    const files = glob.sync('src/**/*.{ts,tsx}', { cwd: this.options.rootPath });
    this.log(`Found ${files.length} files to scan`);
    return files.map(file => path.join(this.options.rootPath, file));
  }

  hasImport(content, importStatement) {
    return content.includes(importStatement.split(' from ')[0]);
  }

  needsImport(content, pattern) {
    // Check if the pattern is used but import is missing
    const usesPattern = pattern.regex.test(content);
    const hasImport = this.hasImport(content, pattern.import);
    return usesPattern && !hasImport;
  }

  addImport(content, importStatement) {
    const lines = content.split('\n');
    const importIndex = lines.findIndex(line => line.includes('import ') && !line.includes('from'));
    
    if (importIndex === -1) {
      // No existing imports, add at top
      return `${importStatement}\n${content}`;
    }
    
    // Find last import statement
    let lastImportIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import ')) {
        lastImportIndex = i;
      }
    }
    
    lines.splice(lastImportIndex + 1, 0, importStatement);
    return lines.join('\n');
  }

  applyPattern(content, pattern, filePath) {
    let newContent = content;
    let changes = 0;

    // Apply the replacement
    if (typeof pattern.replacement === 'string') {
      newContent = newContent.replace(pattern.regex, pattern.replacement);
    } else if (typeof pattern.replacement === 'function') {
      newContent = newContent.replace(pattern.regex, pattern.replacement);
    }

    // Check if changes were made
    if (newContent !== content) {
      changes++;
      
      // Add required import if needed
      if (pattern.import && this.needsImport(newContent, pattern)) {
        newContent = this.addImport(newContent, pattern.import);
      }
    }

    return { content: newContent, changes };
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let totalChanges = 0;

      for (const pattern of this.patterns) {
        const result = this.applyPattern(newContent, pattern, filePath);
        newContent = result.content;
        totalChanges += result.changes;
      }

      if (totalChanges > 0) {
        this.changes.push({
          file: filePath,
          changes: totalChanges,
          originalContent: content,
          newContent: newContent
        });

        if (!this.options.dryRun) {
          fs.writeFileSync(filePath, newContent);
          this.log(`Applied ${totalChanges} changes to ${filePath}`);
        } else {
          this.log(`[DRY RUN] Would apply ${totalChanges} changes to ${filePath}`);
        }
      }
    } catch (error) {
      this.log(`Error processing ${filePath}: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      totalFiles: this.changes.length,
      totalChanges: this.changes.reduce((sum, change) => sum + change.changes, 0),
      changes: this.changes.map(change => ({
        file: path.relative(this.options.rootPath, change.file),
        changes: change.changes
      }))
    };

    const reportPath = path.join(this.options.rootPath, 'safe-navigation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Report generated: ${reportPath}`);
    
    return report;
  }

  async run() {
    this.log('Starting Safe Navigation Audit...');
    
    if (this.options.dryRun) {
      this.log('Running in DRY RUN mode - no changes will be made');
    }

    try {
      const files = await this.scanFiles();
      
      for (const file of files) {
        await this.processFile(file);
      }

      const report = this.generateReport();
      
      console.log('\n=== Safe Navigation Audit Complete ===');
      console.log(`Files processed: ${files.length}`);
      console.log(`Files with changes: ${report.totalFiles}`);
      console.log(`Total changes: ${report.totalChanges}`);
      
      if (this.options.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes were actually made');
        console.log('Run without --dry-run to apply changes');
      } else {
        console.log('\n✅ Changes applied successfully');
        console.log('Report saved to safe-navigation-report.json');
      }

      return report;
    } catch (error) {
      this.log(`Error running audit: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Safe Navigation Automated Replacement Script

Usage: node safe-navigation-replacer.js [options]

Options:
  --dry-run    Show what would be changed without making changes
  --verbose    Show detailed logging
  --help       Show this help message

Examples:
  node safe-navigation-replacer.js --dry-run --verbose
  node safe-navigation-replacer.js
  node safe-navigation-replacer.js --verbose
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const replacer = new SafeNavigationReplacer(options);
  
  replacer.run().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = SafeNavigationReplacer;