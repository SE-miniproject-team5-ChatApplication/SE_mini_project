# Usability Test - TC-USAB-01 (NFR-QA-1)

## Goal

Verify that a new user can register and send their first message within **3 minutes**, without instructions or assistance.

Every primary action should be reachable within **2 clicks** from the dashboard.

## Test Setup

1. Ensure MongoDB is running and accessible.

2. Start the backend from the project root:

   ```powershell
   npm run dev:server
   ```

3. Start the frontend in a second terminal:

   ```powershell
   npm run dev:client
   ```

4. Open the application using the local URL printed by Vite (usually `http://localhost:5173/`).

5. Create a helper account named `user01` using the application's registration screen, if it does not already exist.

6. Log in as `user01` in a separate browser or browser profile. Keep this account available to receive messages.

7. Recruit five testers who have never used the application.

**Note:** The project does not currently provide a seed script. The helper account must be prepared through the application's registration screen.

## Instructions for Testers

Give each tester only this instruction:

> Create an account, add user01 as a contact and send them a message.

- Start the stopwatch when the tester first sees the login page.
- Do not provide additional instructions or assistance.
- Record the time when the first message is successfully sent.

## Primary Actions and Click Counts

Measure these actions from the dashboard.

| Action | Clicks | How |
|---|---:|---|
| Find a person | 1 | Type in "Search people" |
| Add contact | 1 | Select "Add contact" in the search result |
| Start a chat | 1 | Select "Chat" next to the contact |
| Send a message | 0-1 | Type and press Enter or select "Send" |
| Attach a file | 1 | Select the attachment (paperclip) button |
| Create a new group | 1 | Select "+ New group" |
| Search messages | 1 | Type in "Search messages" |
| Profile / logout | 1 | Select the buttons at the top of the sidebar |

## Test Results

Record the results for all five testers.

| Tester | Time to First Message | Completed Without Help? | Problems Observed |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

## Pass Criteria

The test passes when:

1. All five testers send their first message within **3 minutes**.
2. No primary action requires more than **2 clicks** from the dashboard.
3. Testers complete the task without assistance.

## Reporting Problems

Record any usability problems observed during testing.

Create GitHub Issues for identified problems and apply the label `usability`.