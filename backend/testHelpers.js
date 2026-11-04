// Groups are no longer created implicitly by x-group-id, so tests seed the ones they use.
const TEST_GROUPS = ["g1", "g2", "grupa-A", "grupa-B", "inna-grupa", "test-grupa"];

async function seedGroups(db, ids = TEST_GROUPS) {
  for (const id of ids) {
    await db.run(`INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)`, [id, id]);
  }
}

module.exports = { seedGroups, TEST_GROUPS };
