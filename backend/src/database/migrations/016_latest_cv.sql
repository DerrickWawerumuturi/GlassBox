-- What the parser read from a signed-in user's latest CV, so a rescan matches
-- again without the PDF and without another LLM call (decisions/cv-storage.md).
--
-- Never the file and never its text: `profile` is the parsed matching profile
-- (roles, skills, dated positions, level, location), and `text_sha256` only
-- tells whether a new upload is the same CV. One row per user; a new upload
-- replaces it. The users row cascades to it, and /account/data deletes it.

create table if not exists latest_cvs (
    user_id         bigint primary key references users(id) on delete cascade,
    profile         jsonb not null,
    file_name       text,
    text_sha256     text not null,
    parser_version  text not null,
    parsed_at       timestamptz not null default now()
);

comment on column latest_cvs.parser_version is
    'llm_client.PARSER_VERSION when this was parsed. A profile from another
     version is not reused: the scan asks for the CV again.';
