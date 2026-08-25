## ADDED Requirements

### Requirement: The public page never renders unpublished draft edits
The system SHALL render the public campaign page exclusively from the campaign's published state and SHALL NOT read or render any unpublished draft, regardless of whether a draft exists.

#### Scenario: A pending draft does not affect the public page
- **WHEN** a campaign has an unpublished draft that differs from its published state
- **THEN** the public page renders the published state only

#### Scenario: Publishing is required for the public page to change
- **WHEN** the owner has edited a draft but not yet published it
- **THEN** the public page shows no evidence of the draft's edits
