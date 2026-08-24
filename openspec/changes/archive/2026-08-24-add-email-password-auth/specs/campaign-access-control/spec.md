## Purpose

Ensures every campaign is only visible and editable by the authenticated user who owns it, instead of the client dictating whose data it sees.

## ADDED Requirements

### Requirement: Campaign ownership on creation
The system SHALL assign a newly created campaign to the currently authenticated user, derived from their session, never from a client-supplied identifier.

#### Scenario: Campaign created for the session user
- **WHEN** an authenticated user submits a request to create a campaign
- **THEN** the system creates the campaign with its owner set to that user's id, ignoring any owner/user identifier the client may have included in the request

#### Scenario: Unauthenticated creation rejected
- **WHEN** a request to create a campaign is made with no authenticated session
- **THEN** the system rejects the request and creates no campaign

### Requirement: Campaign list scoped to owner
The system SHALL return only the authenticated user's own campaigns when listing campaigns, whether via the dashboard or the API.

#### Scenario: Dashboard shows only owned campaigns
- **WHEN** an authenticated user views their campaign list
- **THEN** the system shows only campaigns owned by that user, never campaigns owned by other users

#### Scenario: List API ignores client-supplied owner
- **WHEN** an authenticated user calls the campaign list API
- **THEN** the system returns only campaigns owned by the caller, regardless of any owner/user identifier passed as a query parameter

### Requirement: Campaign read, update, and delete require ownership
The system SHALL only allow a campaign to be viewed, modified, or deleted by the authenticated user who owns it.

#### Scenario: Owner can view, edit, and delete
- **WHEN** the authenticated user who owns a campaign requests to view, update, or delete it
- **THEN** the system performs the requested action

#### Scenario: Non-owner is denied
- **WHEN** an authenticated user who does not own a campaign requests to view, update, or delete it by id
- **THEN** the system denies the request (not-found or forbidden) and makes no change to the campaign

#### Scenario: Unauthenticated access is denied
- **WHEN** a request to view, update, or delete a campaign by id is made with no authenticated session
- **THEN** the system denies the request and makes no change to the campaign
