# public-campaign-rendering Specification

## Purpose

Defines how the public campaign page renders from a campaign's page configuration, and guarantees it degrades safely rather than breaking when that configuration is missing or from an older format.

## Requirements

### Requirement: Sections render in configured order
The system SHALL render a campaign's public page as the sequence of sections defined in its page configuration, in the order configured.

#### Scenario: Configured sections appear in order
- **WHEN** a campaign's page configuration lists sections in a given order
- **THEN** the public page renders those sections in that same order

### Requirement: The entry form is always present and functional
The system SHALL always render a working entry form on the public page, regardless of the page configuration's contents.

#### Scenario: Entry form present even if configuration omits it
- **WHEN** a campaign's stored page configuration does not include an entry-form section
- **THEN** the public page still renders a functional entry form

#### Scenario: Entering the giveaway reveals a personal referral link
- **WHEN** a visitor submits the entry form
- **THEN** the system creates their entry and reveals their personal referral share link and share buttons

### Requirement: Missing or invalid configurations fall back to a default layout
The system SHALL render a sensible default section layout, without error, when a campaign's page configuration is null, in an older/legacy format, or otherwise malformed.

#### Scenario: Null configuration renders the default layout
- **WHEN** a campaign has no page configuration stored
- **THEN** the public page renders the default layout instead of failing

#### Scenario: Legacy configuration renders the default layout
- **WHEN** a campaign's stored page configuration is in the older format (a `theme` value and a plain list of section-name strings)
- **THEN** the public page renders the default layout instead of failing or misinterpreting the old values

#### Scenario: Malformed configuration never produces a server error
- **WHEN** a campaign's stored page configuration does not match any recognized shape
- **THEN** the public page renders the default layout and the request does not fail with a server error

### Requirement: Countdown section reflects the campaign's end date
The system SHALL display a countdown to the campaign's end date when one is set, and SHALL render without error when no end date is set.

#### Scenario: End date set
- **WHEN** a campaign has an end date and a countdown section
- **THEN** the public page shows a countdown to that date

#### Scenario: End date not set
- **WHEN** a campaign has a countdown section but no end date
- **THEN** the public page renders without error and without a countdown

### Requirement: Reward tiers section shows tiers and, once entered, the visitor's progress
The system SHALL display a campaign's reward tiers to every visitor, and SHALL additionally show the current visitor's own progress toward those tiers once they have entered.

#### Scenario: Tiers visible before entering
- **WHEN** a visitor who has not yet entered views a reward-tiers section
- **THEN** the tier list is shown

#### Scenario: Progress visible after entering
- **WHEN** a visitor has entered the giveaway
- **THEN** the reward-tiers section also shows that visitor's own progress toward the tiers

### Requirement: The public page never renders unpublished draft edits
The system SHALL render the public campaign page exclusively from the campaign's published state and SHALL NOT read or render any unpublished draft, regardless of whether a draft exists.

#### Scenario: A pending draft does not affect the public page
- **WHEN** a campaign has an unpublished draft that differs from its published state
- **THEN** the public page renders the published state only

#### Scenario: Publishing is required for the public page to change
- **WHEN** the owner has edited a draft but not yet published it
- **THEN** the public page shows no evidence of the draft's edits

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
