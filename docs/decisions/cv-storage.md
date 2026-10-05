# Decision: keep the parsed latest CV, never the file

**Decided:** 2026-10-05, by the founder: "Keep the parsed skills for the latest
CV, and add the pop-up."
**Files:** `backend/src/database/migrations/016_latest_cv.sql`,
`services/users.py`, `repositories/user_repository.py`, `main.py`
(`/analyze`, `/analyze/reuse`, `/cv/latest`), `Agent/Framework/JobRadarAgent.py`
(`parse` and `match`).

## The problem

A scan was one call: `/analyze` read the PDF to text, deleted the file, and
`JobRadarAgent.run` sent the text to Groq to parse it before searching and
ranking. Nothing parsed was kept. Every rescan, even of the same CV, meant
uploading it again and paying for another LLM call. The upload-first ask also
already felt like data mining to testers (sessions board, "trust").

## What is kept

For **signed-in users only**, one row per user in `latest_cvs`:

| Column | What it is |
|---|---|
| `profile` | the `ParsedQuery` the parser returned: roles, skills, dated positions (role, company, dates), level, education level, location, country, preferences it read |
| `file_name` | the uploaded file's name, so the prompt can say which CV |
| `text_sha256` | a hash of the extracted text, to recognise the same CV again |
| `parsed_at` | when it was parsed |
| `parser_version` | `llm_client.PARSER_VERSION` at parse time |

The profile is everything the matcher needs to rerun (`SearchQuery.from_parsed`,
`Candidate.from_cv`, the role filter, `MarketAnalyzer`), and nothing more.

## What is never kept

- **The PDF.** It is a temp file deleted as soon as its text is read.
- **The text.** Only its sha256 is stored. A hash cannot be turned back into a CV.
- **The parser's `notes`.** Free text from the LLM that could repeat anything
  on the CV (a name, an email). Nothing downstream reads it.
- **Anything for anonymous scans.** No account, no row.

`ParsedQuery` has no name, email or phone field. That full contact data only
exists in the separate `cvs` table, which the user saves themselves from
onboarding (`PUT /cv`). This change does not touch it.

## How it is used

- `POST /analyze`, signed in: if the upload's text hashes to the kept one and
  the parser version is current, the kept profile is used and **Groq is not
  called**. Otherwise the text is parsed and the new profile **replaces** the
  row. A storage failure is logged and never costs the scan.
- `POST /analyze/reuse`: matches the kept profile again, no PDF, no LLM call,
  the same response shape as `/analyze`. 404 when nothing is kept; 409 when it
  was parsed by an older parser version.
- `GET /cv/latest`: `file_name`, `parsed_at`, `skills`, and `reusable` (false
  when the version is stale, so the pop-up does not offer a rescan that would
  409). 404 when nothing is kept.
- `DELETE /cv/latest`: forgets it. `DELETE /account/data` removes it too, and
  deleting the account cascades.

## Why a version, and why the hash

A profile is the output of one prompt and one `ParsedQuery` shape. When either
changes, an old profile may be missing fields the matcher now relies on, so
reuse is refused (409) and the user uploads again. Bump `PARSER_VERSION` in
`llm_client.py` with any change to `USER_PROMPT` or `ParsedQuery`.

The hash makes re-uploading the same CV free. A user cannot tell a rescan from
a re-upload, so both should cost the same: nothing.

## Why a new table, not a column on `analyses`

`analyses` is written by the frontend (`PUT /analysis`) with whatever the
browser holds. The kept profile is written only by the server, from its own
parse. Mixing the two would let a client overwrite what the matcher trusts,
and one would be deleted with the other.

## Privacy wording

Shown in the pop-up and on the profile page:

> We keep the skills read from your latest CV, not the file. Delete them any time from your profile.

## Follow-ups (not in this change)

- The frontend pop-up ("Scan again with your saved CV, or upload a new one")
  and a profile view with a delete button. The API functions are in
  `frontend/src/lib/api.ts`: `GetLatestCV`, `DeleteLatestCV`, `AnalyzeReuse`.
- The privacy page (product-spec #5) should repeat the wording above.
