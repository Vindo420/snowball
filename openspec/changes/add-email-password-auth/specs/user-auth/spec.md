## Purpose

Lets a business owner create an account with an email and password, sign in to reach their own dashboard, and sign out, so the product can tell one operator apart from another.

## ADDED Requirements

### Requirement: Account signup
The system SHALL allow a visitor to create a new account by submitting an email address and a password.

#### Scenario: Successful signup
- **WHEN** a visitor submits a valid, previously unused email address and a password meeting the minimum length policy
- **THEN** the system creates a `User` record with a securely hashed password (the plaintext password is never stored) and signs the visitor in

#### Scenario: Duplicate email rejected
- **WHEN** a visitor submits an email address that already belongs to an existing account
- **THEN** the system rejects the signup with an error and does not create a second account or alter the existing one

#### Scenario: Weak or missing password rejected
- **WHEN** a visitor submits a password that is empty or shorter than the minimum length policy
- **THEN** the system rejects the signup with a validation error and does not create an account

### Requirement: Login
The system SHALL allow a visitor with an existing account to sign in by submitting their email and password.

#### Scenario: Successful login
- **WHEN** a visitor submits an email and password matching an existing account's stored credentials
- **THEN** the system establishes an authenticated session for that user and grants access to their dashboard

#### Scenario: Wrong password rejected
- **WHEN** a visitor submits an email that matches an existing account but a password that does not match the stored credentials
- **THEN** the system rejects the login with a generic authentication error and does not establish a session

#### Scenario: Unknown email rejected
- **WHEN** a visitor submits an email address that does not match any existing account
- **THEN** the system rejects the login with the same generic authentication error used for a wrong password, without revealing whether the email exists

### Requirement: Logout
The system SHALL allow an authenticated user to end their session.

#### Scenario: Successful logout
- **WHEN** an authenticated user triggers logout
- **THEN** the system invalidates the current session so that subsequent requests are treated as unauthenticated

### Requirement: Session-gated dashboard access
The system SHALL require an authenticated session to access any `/dashboard` route.

#### Scenario: Unauthenticated visitor redirected
- **WHEN** a visitor with no authenticated session requests any `/dashboard` route
- **THEN** the system redirects them to the login page instead of rendering the requested page

#### Scenario: Authenticated user allowed through
- **WHEN** a user with a valid authenticated session requests a `/dashboard` route
- **THEN** the system renders the requested page

### Requirement: Public participant-facing routes remain unauthenticated
The system SHALL NOT require an authenticated session to view a public campaign page or to submit a campaign entry.

#### Scenario: Public campaign page accessible without a session
- **WHEN** a visitor with no authenticated session requests a public campaign page (`/c/[slug]`)
- **THEN** the system renders the page normally

#### Scenario: Referral entry endpoint accessible without a session
- **WHEN** a visitor with no authenticated session submits an entry to the public referral endpoint (`/api/referrals`)
- **THEN** the system processes the entry normally, without requiring authentication
