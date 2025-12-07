# BetterFocus - Claude Context File

This file contains important information about how BetterFocus should work and key decisions made during development.

## Task Completion/Cancellation Behavior

**Rule:** When a task is marked as completed or cancelled, it should remain in the current day's task list (or backlog) until the next day.

**Example:**
- A task completed on 6-Dec should stay in the week's task list or backlog for 6-Dec
- On 7-Dec, that task should then move to the completed/cancelled section
- This allows users to see what they completed/cancelled on the current day before it moves to history

**Implementation Notes:**
- Tasks table has a `date` field that tracks the task's date
- Completed/cancelled tasks should only appear in the completed/cancelled section if their `date` is before the current date
- On the current date, completed/cancelled tasks should still appear in the main task list

