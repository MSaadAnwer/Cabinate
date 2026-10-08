# Receipt extraction

In Pantry, choose **Scan a receipt**, take a photo or choose one from the library,
then review the purchases before adding them. Reading a receipt never changes pantry
inventory. The final **Add food items** action imports only the selected, confirmed rows.

## Review behavior

- Clear food purchases with a readable amount start selected. Household goods,
  pet food, and uncertain purchases stay unchecked.
- Names, quantities, and units remain editable. An unreadable amount stays blank
  until the user supplies it. Receipt prices are not inventory quantities; package
  size is not the number of packages bought.
- Excluded purchases remain available to review. A user must explicitly identify an
  uncertain or incorrectly classified purchase as food before including it.
- Totals, tax, payment lines, discounts, and coupons are omitted. Purchase dates do
  not become expiration dates. Classification and image reading can make mistakes;
  the review is the final decision about what enters the pantry.
- Each selected row becomes its own pantry record. Matching existing names does not
  silently combine incompatible quantities or units.

The original photo stays on the device. A resized JPEG copy is sent to the API and
Amazon Bedrock for extraction. The API retains account-owned review data and import
records, including a digest of the input; it does not retain the uploaded image.

## Backend configuration

Receipt extraction reuses the backend's `AWS_BEARER_TOKEN_BEDROCK` and `AWS_REGION`
settings. Its separate `CABINATE_RECEIPT_MODEL` defaults to `amazon.nova-lite-v1:0`.
Enable access to a model that accepts images in the configured AWS region. Nova Micro,
used for text-only recipe suggestions, cannot read receipt photos. See the official
[Nova image guide](https://docs.aws.amazon.com/nova/latest/userguide/modalities-image.html)
and [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).
Keep credentials on the server. Restart the API after changing its environment.

One bounded provider request produces a draft, with a 30-second deadline and a 1 MB
response cap. At most two extractions run concurrently per API instance. Exact repeated
input for the same account reuses its existing draft without another provider request.
The API accepts JPEG/PNG images up to 3,750,000 decoded bytes and 8000 pixels per side;
it bounds the JSON body at 5,100,000 bytes, including requests without Content-Length.
Client image preparation preserves long-receipt proportions and uses a smaller byte cap.

## API and import recovery

| Endpoint | Behavior |
| --- | --- |
| `POST /api/v1/receipts/extract` | `{imageBase64, mediaType}` or `{text}` produces a review draft; no pantry writes. |
| `GET /api/v1/receipts/{id}` | Returns the current account's draft, selected import intent, and completion status. |
| `POST /api/v1/receipts/{id}/confirm` | Confirms a version and selected rows with positive amounts and `foodConfirmed: true`. |

Drafts have `READY`, `IMPORTING`, or `IMPORTED` status. Confirmation locks an immutable
selection before inserting any pantry record. Each record has a deterministic identity
derived from the account, receipt, and line. A replay of the same selection resumes an
interrupted import or returns the existing result; a different selection after locking
returns 409. No MongoDB transaction or replica set is required.

The client saves the reviewed import intent locally before sending it. An uncertain
response retains that exact intent for recovery; it does not blindly send a fresh batch.
Reopening an imported receipt does not add its purchases again or restore pantry records
that were subsequently deleted. Existing pantry edits are fetched rather than overwritten
with an old receipt snapshot. A differently cropped or recompressed photo has a different
input digest, so this is not cross-device detection of every duplicate paper receipt.

## Validation

Run the backend Maven tests with `CABINATE_TEST_MONGODB_URI` set for real database
checks, plus mobile tests, typecheck, and iOS/web exports. Tests exercise mixed goods,
uncertain amounts, upload bounds, provider failures, account isolation, partial imports,
concurrent confirmation, lost-response replay, and previously deleted pantry records.

Browser smoke checks use an isolated synthetic receipt and API fixture, not a live
provider or the user's pantry. Live receipt accuracy, physical-device capture quality,
and native keyboard interactions still need an iPhone and configured provider access.

Verification for this implementation: 138 backend tests passed with real MongoDB,
75 mobile tests and TypeScript checks passed, and iOS Hermes/web exports passed.
Browser checks confirmed that a blank selected quantity prevents an import, edited
quantities reach the pantry, non-food/unknown rows remain excluded, saved reviews
reopen, and imported receipts do not issue another import. No browser console errors
appeared during those checks.
