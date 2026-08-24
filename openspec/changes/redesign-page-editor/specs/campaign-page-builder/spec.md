## MODIFIED Requirements

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

## ADDED Requirements

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
