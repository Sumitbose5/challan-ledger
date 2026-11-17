# Challan Ledger

Upload a challan Excel sheet, pick a day, and see that day's total challan amount, credit, debit and balance, plus a dashboard of insights. Download the selected day (or the whole file) as an Excel report.

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · ExcelJS

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and upload your `.xlsx` file. Node 20 or newer is recommended.

```bash
npm run typecheck   # TypeScript check
npm run build       # production build
npm start           # serve the production build
```

Everything runs in the browser. The uploaded file is never sent to a server.

## What you get

- **Date filter**: single day (calendar, previous/next day with challans) or all dates. The calendar only enables days that have challans. Clicking a bar in the trend chart also opens that day.
- **Total challan amount**: sum of the `amount` column for the selected view.
- **Ledger**: debit, credit, balance and a settled-share bar.
- **Insights**: day-by-day trend, split by court/department, fine amounts, top vehicles, written highlights, and searchable challan and vehicle tables.
- **Excel download** (`challan-report-YYYY-MM-DD.xlsx`) with four sheets:
  - `Summary`: ledger, key figures, insights, breakdown by court and by status.
  - `Challans`: every challan in the view, with Debit, Credit and a running Balance per row.
  - `Vehicles`: per-vehicle count, debit, credit and balance.
  - `Daily`: per-day ledger (only in the "All dates" report).

  Totals in the workbook are live Excel formulas, so they update if you edit a row.

## Two things the sheet does not contain

The sheet may include an explicit date column such as `Assigned`, and if it does not, the date is derived from the challan number.

**1. Date.** If a valid date field is present (for example `Assigned`), that is used. Otherwise each challan number ends with a 12-digit `YYMMDDHHMMSS` timestamp, e.g. `UP136319230804194602` is 4 Aug 2023, 19:46:02. Rows whose number has no valid timestamp are counted and shown only under "All dates", with a notice on the dashboard.
Code: `lib/challan-date.ts`

**2. Credit, debit, balance.**

| Term | Meaning |
| --- | --- |
| Debit | Total `amount` of the challans (what was raised) |
| Credit | Total `amount` where `status` is settled: `completed`, `paid`, `success`, `successful`, `settled` |
| Balance | Debit − Credit (what is still open) |

In your sample file every challan is `completed`, so credit equals debit and the balance is ₹0 on every day.
To change which statuses count as paid, or to change the definition entirely, edit `lib/ledger.ts`. The dashboard and the Excel export both read from it.

## Expected Excel format

The first sheet (ideally named `Payment links`) with these headers in row 1: `rowNumber, challanNo, registrationNo, chassis, chassisSource, chassisLookupStatus, engine, engineSource, mobile, courtDepartment, amount, type, status, description, paymentUrl, backupStatus, backupUrl`.

Columns are matched by name, so their order does not matter. Only `challanNo`, `registrationNo`, `amount` and `status` are required. A clear error is shown if one is missing.

## Project layout

```
app/                     layout, page, globals.css (theme tokens)
components/
  challan-app.tsx        upload -> dashboard flow
  file-dropzone.tsx
  dashboard/             date filter, KPIs, charts, insights, tables
  ui/                    shadcn/ui components (button, card, calendar, popover, chart, ...)
lib/
  parse-excel.ts         read the workbook
  challan-date.ts        date from challan number
  ledger.ts              credit / debit / balance rules
  analytics.ts           filtering, grouping, insights
  export-excel.ts        build the downloadable report
```

`components.json` is configured, so you can add more shadcn components with `npx shadcn@latest add <component>`.
