# Decision: embeddings

**File:** `backend/src/Agent/utils/embedder.py`

## What they are used for now

One thing: deciding which retrieved postings belong to the user's market before
an analysis counts skill demand (`filter_by_role`). The market statistics weight
every posting equally, so a copywriter vacancy in the corpus would otherwise
make its skills "market demand". Measured on a real corpus, cosine of role +
skills against the job title separated best (F1 0.93; adding descriptions made
it worse). See the 2026-08-21 market-quality changelog.

Matching a job to the user no longer uses embeddings. Until 2026-09-22 the
match score was four facet cosines (title, skills, experience, location); it was
replaced because textual closeness is not fit — a one-year developer scored
62% for a five-year senior role. See `decisions/fit-matching.md`, which also
records the models considered as replacements.

## Model

`sentence-transformers/all-MiniLM-L6-v2` — 6 layers, 384-dimensional output.
Chosen for cost rather than accuracy ceiling: it runs on CPU, and the filter
embeds one profile string against a few dozen titles per analysis. Baked into
the image (`HF_HOME=/opt/hf`, `HF_HUB_OFFLINE=1`) so a cold start never
downloads it.

**Runtime: ONNX Runtime, not torch (2026-10-12, GitHub issue #4).** The model's
repository ships an ONNX export of the same weights (`onnx/model.onnx`, pinned
to revision `1110a243`). `embedder.py` runs it with `onnxruntime` and the
repository's `tokenizer.json`, then does what sentence-transformers did: 256
tokens at most, mean pooling over the attention mask, unit length. Measured
against sentence-transformers 5.7 on three profiles and 27 titles: cosines
agree to 2.7e-7 and the market filter keeps exactly the same jobs
(`tests/test_embedder.py` holds recorded values). Torch was 790 MB of the
image's 1.7 GB of packages; the analysis stack now loads in about 1.3 s in the
container instead of 8.5 s (`deployment.md`, "What wakes the API"). One batch
of 40 titles takes about 70 ms on a laptop (torch: about 35 ms); per scan that
doesn't matter.

## If embeddings come back into matching

- As a **role-fit signal** beside the rule-based families, a job-title model
  (TechWolf JobBERT-v2) is the candidate: it is trained on job titles and their
  skills. ~420 MB in a 4 GiB container that already holds spaCy's large model.
- As a **reranker** over the top jobs a user can actually get — never as the
  thing that decides whether they can get it.
- Job-side vectors would be computed once per posting, in the daily run or on
  first read, like `job_profiles` — never per request.

## Failure behaviour

`filter_by_role` keeps everything when the profile is empty or no title scores
above zero, and never trims below the minimum-jobs floor, so a failure to
separate costs precision in the market numbers, never the analysis.
