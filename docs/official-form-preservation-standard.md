# Official Government Form Preservation Standard

## Status and scope

All forms supplied by Batanes State College for ProcureWise are **controlled government source documents**. This standard applies to every supplied procurement form, annex, appendix, worksheet, notice, evaluation sheet, and print-ready attachment, including all future files provided by the institution.

> The supplied document is the authoritative form. ProcureWise must reproduce it faithfully rather than redesigning, simplifying, expanding, or interpreting it.

## Non-alteration rule

Without the user’s explicit approval for a specific change, the implementation must not alter the form’s wording, headings, field labels, section order, scoring scale, instructions, notes, signatories, signature blocks, required dates, column order, table geometry, or print layout. This also prohibits substituting government terminology, introducing new substantive questions, collapsing rows, changing rating values, or replacing official text with application-oriented copy.

The same source structure must be retained in the on-screen form, generated PDF, printable view, and any export intended to represent the official form. When a layout cannot be reproduced exactly in a narrow viewport, the application must preserve the form structure and use a non-substantive access control such as horizontal scrolling rather than omit or reflow official columns.

## Permitted system controls

The application may add only minimal controls that sit outside the official form content and are required to operate the system securely. Examples include authenticated access, role checks, saving and retrieving the recorded form, file download, a non-substantive mobile scroll cue, error feedback, and an application submit action. These controls must not change the form’s recorded content or the official PDF/print layout.

| Category | Permitted without changing the official form | Requires explicit approval |
|---|---|---|
| Access | Authentication, role checks, record ownership checks | Changing who is named as an official respondent or signatory |
| Data entry | Binding existing fields to saved record values | Adding, deleting, combining, renaming, or repurposing form fields |
| Layout | Responsive containment and horizontal scrolling that retain all content | Changing table geometry, visual hierarchy, section sequence, or print layout |
| Output | Faithful PDF/print reproduction and download actions | New wording, annotations, summaries, scores, or content inside the form |
| Workflow | External save/submit controls and audit metadata | Changing prescribed instructions, approvals, signatories, or procedural content |

## Required implementation process

Before implementing a new supplied form, ProcureWise will record a field-by-field mapping of the source document. The mapping must identify every heading, table, criterion, input, date, signature, and instruction. Any mismatch, missing item, ambiguity, or requested operational addition must be presented for confirmation before it is placed inside the official-form surface.

After implementation, the source form and rendered form must be reviewed side by side. The review checks content, field order, rating values, table columns, sign-off blocks, and generated PDF/print output. No fabricated procurement, supplier, or evaluation data may be created to perform this review.

## Change-control rule

If Batanes State College issues a revised official form, the prior implementation is retained as historical evidence and a new reviewed form version is mapped before release. Changes to a controlled form require a clearly recorded approval from the user or an authorized institutional representative. System-only changes that do not touch official form content may proceed normally, but the separation must be maintained.
