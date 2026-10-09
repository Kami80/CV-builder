# Academic CV Studio — Guided Applicant Intake (V2)

A responsive, static, no-build academic CV questionnaire. Applicants complete a guided seven-step form, see a live preview, and download a Markdown (`.md`) document to send to their CV editor. The form **does not** email or submit their CV information for them.

## Quick start

1. Extract the ZIP. Keep all files in one folder.
2. Open **`index.html`** in a current browser. For reliable draft saving, hosting the site on a normal HTTPS static host is recommended.
3. Fill out each step; use the small tabs within a step to switch between related sections. Add as many entries as needed. Optional steps can be skipped.
4. Check the CV preview (right panel on desktop, **Preview** tab on mobile).
5. Select **Review & export** or **Download CV (.md)**. Send the downloaded Markdown file to the CV preparer through email or chat.
6. To revise later, **Import .md** to restore all editable fields from the last file exported by this site.

## The seven guided steps

1. **About you** — name, contact links, short academic summary and research interests.
2. **Education** — degrees, institutions, GPAs, thesis details and standardized tests.
3. **Experience** — research, employment and teaching experience.
4. **Research output** — publications, projects and conferences.
5. **Skills** — technical skills and spoken languages.
6. **More about you** — awards, interests, references and custom sections.
7. **Review & export** — completion checks and final Markdown download.

The left-side wizard keeps track of which steps you have **reviewed**, including steps you chose to skip. The bar does **not** validate whether the CV is objectively complete. The editor permits partial submissions.

## Publish as a website

### GitHub Pages

Create a public repository and upload these files directly to the repository root: `index.html`, `reference-academic-cv.pdf`, and `reference-cv-preview.webp` (plus optional `README.md` and `example_completed_cv.md`). Enable GitHub Pages from the main branch and root folder in repository settings. Share the resulting site URL.

### Netlify

Upload the **unzipped folder** using Netlify's static-site manual deployment. The site needs no build command, backend, database, or environment variables.

### Other hosts

Upload the three website files together to any standard HTTPS static host. A local `index.html` file can also be opened directly, but some browsers limit local storage on `file://` pages; hosted HTTPS avoids that inconsistency.

## Contents

- `index.html` — all HTML, CSS and JavaScript bundled into one page.
- `reference-academic-cv.pdf` — the provided two-page reference CV.
- `reference-cv-preview.webp` — preview thumbnail for the reference card.
- `example_completed_cv.md` — example applicant Markdown output, which can also be imported and edited.
- `README.md` — these deployment and usage instructions.

## Privacy and data handling

- The site needs no account and contains **no remote scripts, tracking, or backend upload**. All form handling stays in the visitor's browser.
- Drafts are automatically saved to the current browser's `localStorage` where available. Data is **not** encrypted, synced, or backed up; other users of the same browser profile may be able to access it. Export a `.md` file for backup and avoid shared devices for sensitive information.
- The exported Markdown includes the readable CV and a hidden `CV_FORM_STATE` HTML comment with base64-encoded full answers so that import can restore the form. **This is not encryption**; share the file only with trusted recipients.
- The website does not submit anything automatically. The applicant must download the `.md` file and send it to the CV editor themselves.
- **Important for the owner:** the reference PDF supplied with the site is an actual CV and contains the owner's email and GitHub URL. Anyone visiting a published website can access this document. Replace or remove the reference assets and links if you don't want those details public.
- Applicants should ask their references for consent before sharing contact details.

## Previous-version compatibility

The structured Markdown importer retains compatibility with Markdown files exported by the original V1 questionnaire. V2 preserves the V1 form schema (`version: 1`) and adds only local browser progress state for the guided wizard. The `.md` file exports use the same human-readable section style and include complete editable data for re-import.

## Customization

Colors and layout are in the CSS at the top of `index.html`. The `WIZARD_STEPS` mapping controls stage grouping. `FIELD_SETS` and `PROFILE_FIELDS` control editable fields, while `generateMarkdown()` controls the export. Adding entirely new field types or sections may require editing the export and preview logic.
