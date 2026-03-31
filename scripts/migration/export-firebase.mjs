import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "./out");
const outFile = path.join(outDir, "firebase-export.json");

function getFirebaseApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountRaw) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountRaw)),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
  });
}

async function dumpCollection(db, name) {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  const app = getFirebaseApp();
  const db = getFirestore(app);

  const [users, adminAccess, platformTemplates, userTemplates, payments, templateUses] = await Promise.all([
    dumpCollection(db, "users"),
    dumpCollection(db, "admin_access"),
    dumpCollection(db, "platform_templates"),
    dumpCollection(db, "user_templates"),
    dumpCollection(db, "payments"),
    dumpCollection(db, "template_uses"),
  ]);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outFile,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        users,
        adminAccess,
        platformTemplates,
        userTemplates,
        payments,
        templateUses,
      },
      null,
      2,
    ),
  );

  console.log(`Export concluido: ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

