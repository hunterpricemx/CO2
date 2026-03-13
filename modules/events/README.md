# Events Module

## Purpose

Manages server events (in-game events with schedules and rewards).
Supports multilingual content (ES/EN/PT), versioning (1.0/2.0/both), and three statuses.

## Public Exports

### Types & Schemas
| Export | Description |
|---|---|
| `EventRow` | Full database row type |
| `EventCardData` | Simplified type for public listing cards |
| `EventFilters` | Filter params for admin queries |
| `eventSchema` | Zod schema for form validation |
| `CreateEventInput` | Inferred type from eventSchema |
| `UpdateEventInput` | Partial CreateEventInput |

### Queries (Server Component safe)
| Function | Description |
|---|---|
| `getPublishedEvents(version, locale)` | Published events for public site |
| `getEventById(id)` | Single event by UUID (admin edit) |
| `getEventsForAdmin(filters, page, pageSize)` | Paginated events for admin table |

### Server Actions
| Function | Description |
|---|---|
| `createEvent(input)` | Create new event |
| `updateEvent(id, input)` | Update event fields |
| `deleteEvent(id)` | Delete event permanently |
| `setEventStatus(id, status)` | Publish / archive / draft |

## How to Extend

- **Countdown timer**: use `schedule` field + client-side timer component.
- **Recurring events**: add `recurrence_rule` column and parse with `rrule` library.
- **Featured banner**: add `is_featured: boolean` column and query with `.eq("is_featured", true)`.
