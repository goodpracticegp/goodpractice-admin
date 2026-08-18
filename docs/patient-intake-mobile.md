# Patient Intake Mobile App

## First release

The Patient Intake module is available as an installable mobile web app for authorised Good Practice GP staff. It uses the same authenticated application and Supabase access controls as the desktop administration system.

The mobile version provides:

- Good Practice branded header and home-screen icon
- installable app metadata for Android and iPhone
- touch-sized controls and safe-area support
- fixed mobile navigation for dashboard, patient intake, new intake and supplies
- responsive patient list, form, record view and editing
- a mobile save bar that remains reachable above the navigation

## Health-data protection

The service worker uses network-only behaviour. It does not place patient records, authenticated pages or clinical responses in browser Cache Storage. Device-level browser data, screenshots, downloaded files and an authenticated session remain operational risks and must be covered by the practice's mobile-device policy.

## Installation

On Android Chrome, open the deployed administration site and select Install app. On iPhone Safari, select Share and then Add to Home Screen.

## Deferred patient version

Patient self-service is not enabled in this release. It requires patient identity verification, a patient-specific submission policy, separation from staff notes, rate limiting, abuse controls, a practice-approved privacy notice and a separate security review.
