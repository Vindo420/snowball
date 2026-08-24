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
