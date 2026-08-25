## ADDED Requirements

### Requirement: Draft and paused campaigns are not publicly reachable
The system SHALL respond not-found for the public page of a campaign whose status is `DRAFT` or `PAUSED`.

#### Scenario: A draft campaign's public page is not found
- **WHEN** a visitor requests the public page of a campaign whose status is `DRAFT`
- **THEN** the system responds not-found

#### Scenario: A paused campaign's public page is not found
- **WHEN** a visitor requests the public page of a campaign whose status is `PAUSED`
- **THEN** the system responds not-found

#### Scenario: An active campaign's public page renders
- **WHEN** a visitor requests the public page of a campaign whose status is `ACTIVE`
- **THEN** the system renders the page normally

### Requirement: An ended campaign shows a final, read-only state instead of not-found
The system SHALL render the public page of an `ENDED` campaign successfully rather than responding not-found, showing a clear message that the giveaway has finished together with the campaign's final leaderboard, and SHALL NOT present a working entry form on it.

#### Scenario: An ended campaign's page renders successfully with the final results
- **WHEN** a visitor requests the public page of a campaign whose status is `ENDED`
- **THEN** the system responds successfully, showing a message that the giveaway has finished and the campaign's final leaderboard

#### Scenario: An ended campaign's page does not offer an entry form
- **WHEN** a visitor views the public page of a campaign whose status is `ENDED`
- **THEN** the entry form is hidden or disabled rather than shown as a working form

### Requirement: New entries are only accepted for active campaigns
The system SHALL reject a request to enter a giveaway when the campaign's status is not `ACTIVE`, and SHALL NOT create a participant record for it, enforced server-side regardless of what the requesting client shows.

#### Scenario: An entry submitted to an ended campaign is rejected
- **WHEN** a request to enter is made for a campaign whose status is `ENDED`
- **THEN** the system rejects the request and creates no participant record

#### Scenario: An entry submitted to an active campaign succeeds
- **WHEN** a request to enter is made for a campaign whose status is `ACTIVE`
- **THEN** the system creates the participant record as normal
