## Purpose

Lets a campaign owner assemble their public campaign page from a list of sections — adding, removing, reordering, and editing them — with a live preview, instead of a fixed hardcoded layout.

## ADDED Requirements

### Requirement: Owner can manage the section list
The system SHALL allow the authenticated owner of a campaign to add a section, remove a section, and reorder sections using up/down controls (not drag-and-drop).

#### Scenario: Adding a section
- **WHEN** the owner adds a new section of a supported type
- **THEN** the section appears in the list and, once saved, in the public page's rendering

#### Scenario: Removing a section
- **WHEN** the owner removes a section other than the entry form
- **THEN** the section is removed from the list and, once saved, no longer appears on the public page

#### Scenario: Reordering with up/down controls
- **WHEN** the owner moves a section up or down in the list
- **THEN** the section's position changes relative to its neighbors, and the new order is reflected once saved

### Requirement: The entry form section cannot be removed
The system SHALL always include exactly one entry-form section in the page configuration and SHALL prevent it from being removed, both in the editing interface and when a configuration is saved.

#### Scenario: Entry form has no remove control
- **WHEN** the owner views the section list
- **THEN** the entry-form section does not offer a remove action, unlike other sections

#### Scenario: Saving a configuration that omits the entry form is rejected
- **WHEN** a save request is made with a page configuration that has no entry-form section
- **THEN** the system rejects the save with a validation error and does not persist the configuration

### Requirement: Owner can edit each section's content
The system SHALL provide a form appropriate to each section's type for editing its content (for example, the hero section's headline, subtext, and image URL).

#### Scenario: Editing hero content
- **WHEN** the owner edits the hero section's headline, subtext, or image URL and saves
- **THEN** the public page reflects the updated content

### Requirement: Live preview reflects unsaved changes
The system SHALL show the owner a preview of the public page that reflects their current edits before those edits are saved.

#### Scenario: Preview updates as the owner edits
- **WHEN** the owner changes a section's content, order, or presence in the editor
- **THEN** the preview updates to reflect that change without requiring a save first

### Requirement: Saved configurations are validated
The system SHALL validate a page configuration against its defined shape before persisting it, rejecting invalid configurations rather than silently saving them.

#### Scenario: Invalid section data is rejected
- **WHEN** a save request includes a section that does not match its type's expected shape
- **THEN** the system rejects the save with a validation error and does not persist the invalid configuration

### Requirement: Editing access is owner-only
The system SHALL only allow the authenticated owner of a campaign to view or edit that campaign's page configuration; a non-owner (or unauthenticated request) is denied.

#### Scenario: Non-owner cannot access the editor
- **WHEN** an authenticated user who does not own a campaign attempts to view or edit its page configuration
- **THEN** the system denies the request (not-found), consistent with how campaign detail access is denied elsewhere

#### Scenario: Unauthenticated request is denied
- **WHEN** a request to view or edit a campaign's page configuration is made with no authenticated session
- **THEN** the system denies the request

### Requirement: Live preview never creates real data
The system SHALL prevent the editor's live preview from creating any real participant or leaderboard data, regardless of how the owner interacts with it.

#### Scenario: Submitting the preview's entry form has no effect
- **WHEN** the owner fills in and submits the entry form shown in the live preview
- **THEN** no participant record is created and the campaign's real leaderboard and participant data are unchanged
