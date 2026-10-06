// Run with mongosh against the selected Cabinate database. Stop API writes first.
// Dry run is the default. The destination must be chosen by the data owner/operator.
const account = process.env.CABINATE_MIGRATION_OWNER_ID;
const apply = process.env.CABINATE_MIGRATION_APPLY === "true";
if (!account || (account.trim().length === 0 || account.length > 255)) {
  throw new Error("Set CABINATE_MIGRATION_OWNER_ID to the intended owner's account ID.");
}
for (const name of ["recipes", "pantry_items", "raw_ingest_payloads"]) {
  const collection = db.getCollection(name);
  // Missing/null ownership is legacy data. Never reassign an already-owned record.
  const legacy = { ownerId: null };
  const needsVersion = { ownerId: account, version: null };
  printjson({ collection: name, apply, legacy: collection.countDocuments(legacy),
    ownedWithoutVersion: collection.countDocuments(needsVersion) });
  if (apply) {
    // Preserve any existing version; ownership and version updates are separately idempotent.
    collection.updateMany(legacy, { $set: { ownerId: account } });
    collection.updateMany(needsVersion, { $set: { version: NumberLong(0) } });
  }
}
