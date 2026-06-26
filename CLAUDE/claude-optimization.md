# Claude Code Optimization Guide

## How to Work Effectively with Claude Code

### When to Use Subagents vs Direct Tools

**🤖 Use Task Tool with `general-purpose` Agent For:**
- Multi-file analysis across packages/modules
- Complex search patterns requiring multiple rounds of searching
- Large-scale code migrations affecting many functions
- Research tasks requiring systematic investigation
- Initial codebase exploration and architecture analysis

**Example:**
```
"Find all functions that use AWS CLI commands and analyze their dependency relationships across the entire codebase"
```

**🔧 Use Direct Tools (Read, Edit, Grep, etc.) For:**
- Single file modifications
- Known file/function location changes
- Quick syntax fixes and imports
- Specific line number changes
- Simple searches with known targets

**Example:**
```javascript
// Fix known import error in specific file
import { Route53Client, ListHostedZonesByNameCommand } from "@aws-sdk/client-route-53";
```

### MCP Tool Preferences & Best Practices

**💡 Prefer Built-in MCP Tools:**
- `mcp__ide__getDiagnostics` - Get real-time syntax/type errors
- `mcp__ide__executeCode` - Test Node.js code snippets
- Use over custom tools when available

**📁 File Operations Optimization:**
```bash
# ✅ Efficient: Use Read for specific files
Read: /path/to/specific/file.js

# ✅ Efficient: Use Glob for pattern matching  
Glob: packages/pushkin-cli/src/**/*.js

# ❌ Inefficient: Task agent for single file reads
Task: "Read the contents of index.js"
```

**🔍 Search Strategy Optimization:**
```bash
# ✅ For known patterns
Grep: "makeRecordSet" --glob="*.js"

# ✅ For systematic exploration
Task: "Find all AWS CLI usage patterns and categorize by service"

# ❌ Over-engineering simple searches
Task: "Find the makeRecordSet function" (just use Grep)
```

## Context Provision Best Practices

### Session Startup Optimization
**Start each session by updating:**
```markdown
# CLAUDE/current-focus.md
## Today's Goal
Fix Route53 function signature mismatches

## Files to Modify
- packages/pushkin-cli/src/commands/aws/index.js (line ~XXX)

## Expected Changes
- Update deployFrontEnd() calls to makeRecordSet()
- Remove hostedZoneId parameter

## Success Criteria
- No "makeRecordSet expects" errors
- pushkin aws init completes Route53 setup
```

### Efficient Context Updates
**📋 Use structured updates:**
```markdown
## Current Status
- ✅ Completed: Route53 imports added
- 🔄 In Progress: Function signature fixes  
- ❌ Blocked: Missing ECS SDK dependency

## Immediate Next Steps
1. Fix line 245 in deployFrontEnd()
2. Test with pushkin aws init
3. Add @aws-sdk/client-ecs dependency
```

### Error Reporting Best Practices
**🎯 Provide exact error context:**
```markdown
## Error Encountered
File: packages/pushkin-cli/src/commands/aws/index.js:245
Error: makeRecordSet() expects 3 arguments, received 4
Current Call: makeRecordSet(domain, zoneId, record, value)
Expected Call: makeRecordSet(domain, record, value)
```

## Tool Usage Patterns

### Efficient Batch Operations
```javascript
// ✅ Use MultiEdit for related changes in same file
MultiEdit: [
  { old_string: "makeRecordSet(domain, zoneId,", new_string: "makeRecordSet(domain," },
  { old_string: "makeRecordSet(siteName, hostedZone,", new_string: "makeRecordSet(siteName," }
]

// ✅ Use multiple Read calls in parallel for related files
Read: packages/pushkin-cli/src/commands/aws/index.js
Read: packages/pushkin-cli/src/commands/aws/awsConfigs.js
Read: packages/pushkin-cli/package.json
```

### Progressive Development Strategy
```markdown
1. **Analysis Phase**: Use Task agent for comprehensive understanding
2. **Implementation Phase**: Use direct tools for specific changes
3. **Testing Phase**: Use Bash + Read for validation
4. **Documentation Phase**: Update context files with findings
```

## Advanced Claude Features

### Todo List Management
**Use TodoWrite proactively for:**
- Multi-step migrations (AWS CLI → SDK)
- Complex debugging sessions
- Feature implementation with dependencies
- Progress tracking across sessions

**✅ Effective Todo Patterns:**
```javascript
[
  { "content": "Add missing Route53 imports", "status": "completed" },
  { "content": "Fix makeRecordSet function calls", "status": "in_progress" }, 
  { "content": "Test Route53 integration", "status": "pending" },
  { "content": "Add RDS SDK dependency", "status": "pending" }
]
```

### Commit Message Generation
**Request specific commit assistance:**
```markdown
"Generate a commit message for changes to:
- Fixed makeRecordSet() signature in deployFrontEnd()  
- Updated Route53 imports in awsConfigs.js
- Removed unused hostedZoneId parameter"

Expected: "fix Route53 function calls and imports"
```

### Testing Integration
```bash
# ✅ Systematic testing approach
1. Bash: npm run build                    # Build changes
2. Bash: pushkin aws list                 # Basic validation
3. Read: Check error logs if needed       # Debug issues
4. Task: Comprehensive testing if complex # Integration tests
```

## Communication Optimization

### Concise Request Patterns
**✅ Effective requests:**
- "Fix Route53 imports in awsConfigs.js"
- "Update makeRecordSet calls to new signature"
- "Add @aws-sdk/client-rds to dependencies"

**❌ Over-detailed requests:**
- "Please help me understand and then carefully fix the Route53 import issues while making sure to consider all the implications..."

### Progress Communication
**Claude will provide:**
- ✅ Direct answers without preamble
- ✅ Line-specific references: "Fixed line 245 in index.js"
- ✅ Specific error patterns and solutions
- ✅ Commit-ready summaries

**Request clarification for:**
- Complex architectural decisions
- Multi-step migration strategies  
- Testing approach validation

## File Organization for Claude Efficiency

### Context File Structure (Current)
```
CLAUDE/
├── codebase-architecture.md    # Code structure, AWS services used
├── dev-workflow.md            # Build/test commands, git workflow
├── error-patterns.md          # Known issues and solutions  
├── migration-progress.md      # AWS CLI→SDK tracking
├── claude-optimization.md     # This file - how to work with Claude
├── current-focus.md          # Session-specific context
└── logs/                     # Conversation history
    ├── deployment-test-1.md
    └── aws-sdk-migration-1.md
```

### Update Frequency
- **current-focus.md**: Every session start
- **migration-progress.md**: After completing each service migration
- **error-patterns.md**: When new issues discovered
- **dev-workflow.md**: When build/test process changes

## Common Interaction Patterns

### Starting a New Session
1. **Check current status**: `git status && cat CLAUDE/current-focus.md`
2. **Update focus**: Edit current-focus.md with today's goals  
3. **Build latest**: `cd packages/pushkin-cli && npm run build`
4. **Begin work**: Make focused request to Claude

### During Development
1. **Make changes**: Use specific edit requests
2. **Test immediately**: `pushkin aws list` or relevant test
3. **Update progress**: Mark todos as completed
4. **Document issues**: Add to error-patterns.md if new issues found

### Session Wrap-up
1. **Commit changes**: Let Claude help with commit messages
2. **Update progress**: Update migration-progress.md status
3. **Plan next session**: Update current-focus.md with next steps

## Claude's Strengths for This Project

### Excellent For:
- **AWS SDK migration patterns**: Converting CLI to SDK systematically
- **Error analysis**: Identifying root causes from error messages
- **Code refactoring**: Breaking down large functions safely
- **Testing strategies**: Creating validation approaches
- **Documentation**: Keeping context files updated

### Work Together On:
- **Architecture decisions**: Discuss before major structural changes
- **Testing approaches**: Validate strategies before implementing
- **Error handling patterns**: Design consistent approaches
- **Migration priorities**: Decide service migration order

### Your Expertise Needed For:
- **Domain knowledge**: Psychology experiment requirements
- **Business logic**: What each AWS service actually needs to do
- **User experience**: How researchers will interact with CLI
- **Testing validation**: Whether deployments actually work for users