# 2026-09-22 — applications on phones, faster imports, matched imports, bulk delete

Follow-ups to the same day's import and matching work, from using it on a phone.

---

### Imports were slow because of distance, not work

The API runs in Azure `southafricanorth` and the database in Neon
`eu-central-1`, so every SQL statement is an intercontinental round trip. The
import wrote each row with about six statements (insert, events, a status
update, a savepoint), so a 200-row sheet made over a thousand of them.

`application_repository.import_many` now writes a batch of up to 500 rows in
two statements: the applications, with status and dates set as they are
inserted, then all their events. A sheet of any length costs a handful of
statements. The import is now one transaction (all rows or none), and a link
to a job the user already tracks is caught as a duplicate before the insert
rather than failing it. Pinned by a test that counts statements for 3 and 40
rows. `decisions/deployment.md` now records the region split.

### Imported rows get matched

After an import returns, a background task finds each row's posting: the pool
job its link matched, else the page behind the link, read the way a pasted
link is. It links the application, fills the columns the sheet left blank, and
scores it against the saved CV. The sheet's own values always win. The
dashboard refreshes a few times over the next minutes to show the results.
Rows without a link, or with a link that blocks automated reading, stay as
imported.

### Bulk delete

`POST /dashboard/applications/delete` deletes saved, rejected and withdrawn
applications and keeps active ones, as the single delete does. On a computer
there is a checkbox column; on a phone, "Select" in a row's long-press sheet
starts selecting, and tapping rows adds them.

### Applications on a phone

- A long press no longer selects text or opens the copy / link-preview menu.
- Delete toasts replace each other and last 2.5 s, and opening a row's sheet
  clears any toast that would sit over its buttons.
- Rows show role and status as columns, with company and place, match, date
  and source in two quiet lines under the role. The long-press sheet shows the
  rest (applied, added, location, source) in full.

### Import wording

The dialog's explanation is four short bullets. Messages about rows and
duplicates are plain sentences.

**Files:** `backend/src/database/repositories/application_repository.py`,
`services/application_import.py`, `services/applications.py`,
`services/spreadsheet.py`, `main.py`, `frontend/.../applications/page.tsx`,
`ApplicationSheet.tsx` (new), `ApplicationParts.tsx`,
`ImportApplicationsDialog.tsx`, `applications-store.tsx`.
