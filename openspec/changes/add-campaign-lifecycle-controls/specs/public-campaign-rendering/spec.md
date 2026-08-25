## ADDED Requirements

### Requirement: The public page is only reachable while the campaign is active
The system SHALL render the public campaign page only when the campaign's status is `ACTIVE`, and SHALL respond not-found for any other status.

#### Scenario: A draft campaign's public page is not found
- **WHEN** a visitor requests the public page of a campaign whose status is `DRAFT`
- **THEN** the system responds not-found

#### Scenario: A paused campaign's public page is not found
- **WHEN** a visitor requests the public page of a campaign whose status is `PAUSED`
- **THEN** the system responds not-found

#### Scenario: An ended campaign's public page is not found
- **WHEN** a visitor requests the public page of a campaign whose status is `ENDED`
- **THEN** the system responds not-found

#### Scenario: An active campaign's public page renders
- **WHEN** a visitor requests the public page of a campaign whose status is `ACTIVE`
- **THEN** the system renders the page normally
