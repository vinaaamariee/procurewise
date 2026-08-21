# Supplier Import Preflight

| Check | Result |
|---|---:|
| Supplied rows | 70 |
| Business names ready for import | 70 |
| TIN not supplied | 6 |
| Repeated normalized TIN groups | 1 |
| Existing ProcureWise supplier rows | 0 (verified separately) |

All records will be created with generated internal codes **SUP-001** through **SUP-070**, status **pending**, and blank fields where the source did not provide information.

## Missing TIN

- NSGB Books Trading
- MOJR Construction Trading & General Services, Ltd, Co.
- Maddies Fashion Design Services
- Good Sheperd professional Training Services
- Smart Communications Inc.
- Bethel General Insurance and Surety Corporation

## Repeated TIN review

- YCA Office Supplies and Equipment Trading (206-113-292-00000); YCA Printing Services (206-113-292-00000)

The repeated TIN values are retained because the user supplied distinct business names. No duplicate business name was automatically removed.
