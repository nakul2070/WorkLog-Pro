# ER Diagram Documentation

This directory contains Entity Relationship (ER) diagrams for the Timesheet Management System database schema.

## Available Formats

### 1. ER_DIAGRAM.md
- **Format**: Mermaid ER Diagram
- **Viewing Options**:
  - GitHub/GitLab: Renders automatically in markdown viewers
  - VS Code: Install "Markdown Preview Mermaid Support" extension
  - Online: Copy the mermaid code to [Mermaid Live Editor](https://mermaid.live)
  - Documentation tools: Most modern documentation platforms support Mermaid

### 2. ER_DIAGRAM.puml
- **Format**: PlantUML ER Diagram
- **Viewing Options**:
  - VS Code: Install "PlantUML" extension
  - Online: Use [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
  - IntelliJ IDEA: Built-in PlantUML support
  - Command line: Install PlantUML and use `plantuml ER_DIAGRAM.puml`

## Quick View Instructions

### View Mermaid Diagram Online
1. Go to https://mermaid.live
2. Open `ER_DIAGRAM.md`
3. Copy the content between the ` ```mermaid ` and ` ``` ` markers
4. Paste into the Mermaid Live Editor

### View PlantUML Diagram Online
1. Go to http://www.plantuml.com/plantuml/uml/
2. Open `ER_DIAGRAM.puml`
3. Copy the entire file content
4. Paste into the PlantUML Online Server

### View in VS Code
1. Install the appropriate extension:
   - For Mermaid: "Markdown Preview Mermaid Support"
   - For PlantUML: "PlantUML"
2. Open the respective file
3. Use the preview/export functionality

## Diagram Contents

Both diagrams include:
- ✅ All 13 database tables
- ✅ Primary keys (PK) for each entity
- ✅ Foreign keys (FK) and relationships
- ✅ One-to-Many relationships
- ✅ Many-to-Many relationships (via junction table)
- ✅ Self-referencing relationships (Users → Users)
- ✅ All key attributes and constraints
- ✅ Relationship cardinalities

## Key Relationships Highlighted

1. **User Hierarchy**: Self-referencing manager relationship
2. **Project Structure**: Clients → Projects → Team Members → Users
3. **Timesheet Flow**: Users → Timesheets → Entries → Projects
4. **Approval Workflow**: Timesheets → Approvals → Project Managers
5. **Leave Management**: Users → Leaves (tracked separately)
6. **Access Control**: Users → Project Access Requests

## Database Tables Included

1. `users` - User accounts and employee information
2. `clients` - Client organizations
3. `projects` - Project definitions
4. `project_team_members` - Many-to-many relationship between users and projects
5. `timesheets` - Monthly timesheet submissions
6. `timesheet_entries` - Individual time entries within timesheets
7. `approvals` - Timesheet approval records
8. `leaves` - Employee leave records
9. `holidays` - Company holiday calendar
10. `project_access_requests` - Requests for project access
11. `audit_logs` - System audit trail
12. `system_configurations` - System configuration settings
13. `sync_logs` - External system synchronization logs

## Notes

- All primary keys are VARCHAR(36) UUIDs
- Foreign key relationships use appropriate ON DELETE actions (CASCADE, RESTRICT, SET NULL)
- Unique constraints are marked in the diagrams
- The diagrams reflect the current database schema including all migrations

