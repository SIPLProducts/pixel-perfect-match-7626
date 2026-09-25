# Asset dashboard enhancement

## What will change
- Add total asset cost alongside current value.
- Calculate equipment age from capitalization/installation date through today.
- Show average equipment age and age-band distribution.
- Add clear Active and Inactive counts with percentages.
- Include installation date and age in asset details and report downloads.

## Technical details
- Read capitalization and purchase dates with the existing asset query.
- Use capitalization date first, then purchase date, then registration date as a fallback.
- Treat active, assigned, and in-stock assets as active; maintenance, repair, missing, damaged, retired, and disposed assets as inactive.
- Keep the existing Frosted Glass dashboard style and responsive behavior.
