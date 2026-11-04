# 15 Oct 2026: "Delete the skills we kept" removes every copy

The profile's "delete the skills we kept" (`DELETE /cv/latest`) removed the latest scan's
profile (`latest_cvs`) but left the saved CV's skills (`cvs`) behind, so /privacy's promise
wasn't literally true. It now deletes both, and reports `deleted: true` when either existed.

- `backend/src/database/repositories/user_repository.py`: `DELETE_KEPT_SKILLS`, two statements.
- `backend/tests/test_api_user_data.py`: `test_deleting_the_kept_skills_removes_every_copy`
  (fails with the `cvs` delete removed).
- Tests: 705 passed against the local test database; 655 passed, 21 skipped with `DATABASE_URL=""`.
- No migration. "Delete all your data" and deleting the account already removed both.
