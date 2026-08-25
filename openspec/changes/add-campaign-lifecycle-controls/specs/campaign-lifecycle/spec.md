## Purpose

Gives the campaign owner control over whether a campaign is running at all — `DRAFT`, `ACTIVE`, `PAUSED`, or `ENDED` — distinct from and never conflated with page-content draft/publish (see `campaign-page-builder`), which governs what a running campaign's page shows, not whether it's reachable at all.

## ADDED Requirements

### Requirement: Owner can change a campaign's status through the UI
The system SHALL let the authenticated owner of a campaign change its status via controls in the dashboard, offering only the transitions valid for its current status: from `DRAFT` or `PAUSED`, activate; from `ACTIVE`, pause or end; from `ENDED`, no further transition.

#### Scenario: Activating a draft or paused campaign
- **WHEN** the owner activates a campaign that is `DRAFT` or `PAUSED`
- **THEN** the campaign's status becomes `ACTIVE`

#### Scenario: Pausing an active campaign
- **WHEN** the owner pauses a campaign that is `ACTIVE`
- **THEN** the campaign's status becomes `PAUSED`

#### Scenario: Ending an active or paused campaign
- **WHEN** the owner ends a campaign that is `ACTIVE` or `PAUSED`
- **THEN** the campaign's status becomes `ENDED`

#### Scenario: Ended campaigns offer no further transition
- **WHEN** the owner views a campaign that is `ENDED`
- **THEN** the status control offers no action to change it further

### Requirement: The lifecycle control is visibly distinct from page-content publishing
The system SHALL present the campaign-status control and the page-content publish control with different, unambiguous labels and as visibly separate controls, so a user cannot mistake changing the campaign's status for publishing page-content edits, or vice versa.

#### Scenario: Distinct labels in the editor
- **WHEN** the owner views the page editor
- **THEN** the page-content action is labeled distinctly from the campaign-status action (for example, "Publish changes" versus "Activate campaign"), and the two controls are visually separated

### Requirement: A DRAFT campaign shows a prominent in-editor notice
The system SHALL show the owner a prominent notice, while editing a `DRAFT` campaign, explaining that its public page is not yet reachable, with an inline action to activate it.

#### Scenario: Notice shown for a draft campaign
- **WHEN** the owner opens the editor for a campaign that is `DRAFT`
- **THEN** a prominent notice explains that visitors currently see a not-found page, and offers an inline action to activate the campaign

#### Scenario: Notice not shown once active
- **WHEN** the owner opens the editor for a campaign that is not `DRAFT`
- **THEN** the notice does not appear

### Requirement: The dashboard never presents a non-live campaign's public URL as a working link
The system SHALL NOT present a campaign's public URL as a normal, working link anywhere in the dashboard while that campaign's status is not `ACTIVE`, since visiting it would 404.

#### Scenario: Draft, paused, or ended campaigns don't show a live link
- **WHEN** the owner views a campaign that is `DRAFT`, `PAUSED`, or `ENDED`
- **THEN** its public URL is either hidden or clearly marked as not currently live, rather than shown as an ordinary working link

#### Scenario: Active campaigns show a normal link
- **WHEN** the owner views a campaign that is `ACTIVE`
- **THEN** its public URL is shown as a normal working link
