# campaign-page-builder Specification

## Purpose

Lets a campaign owner assemble their public campaign page from a list of sections — adding, removing, reordering, and editing them — with a live preview, instead of a fixed hardcoded layout.

## Requirements

### Requirement: Owner can manage the section list
The system SHALL allow the authenticated owner of a campaign to add a section, remove a section, and reorder sections using up/down controls (not drag-and-drop), from both a sidebar section list and floating controls on the canvas preview.

#### Scenario: Adding a section
- **WHEN** the owner adds a new section of a supported type
- **THEN** the section appears in the list and, once published, in the public page's rendering

#### Scenario: Removing a section
- **WHEN** the owner removes a section other than the entry form
- **THEN** the section is removed from the list and, once published, no longer appears on the public page

#### Scenario: Reordering with up/down controls
- **WHEN** the owner moves a section up or down, from either the sidebar controls or the canvas hover controls
- **THEN** the section's position changes relative to its neighbors, and the new order is reflected once published

#### Scenario: Adding a section from the block library
- **WHEN** the owner opens the block library and selects a section type tile
- **THEN** a new section of that type is added to the list, grouped visually in the library by category (for example, Hero under Content; Leaderboard, Reward tiers, and Countdown under Referral mechanics)

#### Scenario: Canvas hover controls do not offer duplication
- **WHEN** the owner hovers over or selects a section on the canvas
- **THEN** the floating control strip offers move up, move down, and delete, and does not offer a duplicate action

### Requirement: The entry form section cannot be removed
The system SHALL always include exactly one entry-form section in the page configuration and SHALL prevent it from being removed, both in the editing interface and when a configuration is saved.

#### Scenario: Entry form has no remove control
- **WHEN** the owner views the section list
- **THEN** the entry-form section does not offer a remove action, unlike other sections

#### Scenario: Saving a configuration that omits the entry form is rejected
- **WHEN** a save request is made with a page configuration that has no entry-form section
- **THEN** the system rejects the save with a validation error and does not persist the configuration

### Requirement: Owner can edit each section's content
The system SHALL provide a form appropriate to each section's type for editing its content (for example, the hero section's headline, subtext, and image URL), shown when that section is selected.

#### Scenario: Editing hero content
- **WHEN** the owner edits the hero section's headline, subtext, or image URL
- **THEN** the canvas preview reflects the change immediately, and the public page reflects it once published

#### Scenario: Selecting a section reveals its edit form
- **WHEN** the owner selects a section in the sidebar
- **THEN** that section's edit form is revealed, and the corresponding section is highlighted on the canvas

#### Scenario: Selecting a section on the canvas reveals its edit form
- **WHEN** the owner selects a section on the canvas
- **THEN** the corresponding entry is highlighted in the sidebar and its edit form is revealed

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

### Requirement: Editor changes are staged as a draft until published
The system SHALL save all editor changes — section content, order, and presence, together with the campaign's headline, subtext, and end date as edited through the editor — to a draft that is separate from the campaign's published state, and SHALL NOT apply those changes to what the public page renders until the owner explicitly publishes.

#### Scenario: Editing does not affect the public page before publishing
- **WHEN** the owner edits and saves a section's content, order, or presence
- **THEN** the public page continues to render the previously published state, unchanged

#### Scenario: Publishing applies the draft
- **WHEN** the owner presses Publish while a draft exists
- **THEN** the draft becomes the campaign's published state, the public page reflects it, and no draft remains

#### Scenario: Publishing with no draft is rejected
- **WHEN** the owner presses Publish while no draft exists
- **THEN** the system rejects the request rather than silently succeeding

#### Scenario: Editor initializes from the draft when one exists
- **WHEN** the owner opens the editor for a campaign that has an existing draft
- **THEN** the editor shows the draft's content, not the published content

#### Scenario: Editor initializes from the published state when no draft exists
- **WHEN** the owner opens the editor for a campaign with no existing draft
- **THEN** the editor shows the campaign's currently published content

### Requirement: Unpublished changes are clearly indicated
The system SHALL show the owner a clear indicator, always visible while editing, of whether a draft exists.

#### Scenario: Indicator reflects draft presence
- **WHEN** a draft exists for the campaign being edited
- **THEN** the top bar shows an unpublished-changes indicator

#### Scenario: Indicator clears after publishing
- **WHEN** the owner successfully publishes
- **THEN** the unpublished-changes indicator no longer shows

### Requirement: A draft can be discarded
The system SHALL let the owner discard the current draft, reverting the editor to the campaign's published state without altering that published state.

#### Scenario: Discarding removes the draft
- **WHEN** the owner discards the draft
- **THEN** the draft is deleted and the editor now shows the campaign's published content

#### Scenario: Discarding never changes what's published
- **WHEN** the owner discards a draft
- **THEN** the campaign's published `pageConfig`, headline, description, and end date are unchanged

### Requirement: Autosave is debounced and its progress is visible
The system SHALL debounce autosave writes rather than issuing a request per keystroke, and SHALL show the owner the save state (saving, saved as a draft, or failed) at all times while editing.

#### Scenario: Rapid edits are debounced into a single save
- **WHEN** the owner makes several edits in quick succession, whether to the same field or across different fields
- **THEN** the system waits until the edits pause before issuing a single autosave request, rather than one request per keystroke or one per field

#### Scenario: Save state reflects an in-progress save
- **WHEN** an autosave request is in flight
- **THEN** the top bar shows a saving indicator

#### Scenario: Save state reflects a completed save
- **WHEN** an autosave request completes successfully
- **THEN** the top bar shows that the change was saved as a draft

### Requirement: Autosave failure never silently loses edits
The system SHALL preserve the owner's in-progress edits and clearly indicate failure when an autosave request does not succeed, rather than discarding the edit or failing silently.

#### Scenario: A failed autosave is shown to the owner
- **WHEN** an autosave request fails, for example due to a network error
- **THEN** the top bar shows a failed-to-save state rather than silently reverting to a previous save state

#### Scenario: Edits are retained after a failed autosave
- **WHEN** an autosave request fails
- **THEN** the owner's edited content remains visible and editable, and is not reverted or lost

#### Scenario: A failed autosave can be retried
- **WHEN** the owner makes another edit or explicitly retries after a failed autosave
- **THEN** the system attempts to save the current content again

### Requirement: The editor provides a device preview toggle
The system SHALL let the owner switch the canvas preview between a desktop width and a mobile width of approximately 390px, affecting only the preview's presentation.

#### Scenario: Switching to mobile preview
- **WHEN** the owner selects the mobile preview option
- **THEN** the canvas preview renders at approximately 390px wide

#### Scenario: Device toggle does not affect saved data
- **WHEN** the owner switches between desktop and mobile preview
- **THEN** no draft or published data changes as a result
