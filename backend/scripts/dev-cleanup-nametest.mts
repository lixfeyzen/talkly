// Alat DEV sekali-pakai: hapus user uji curl talkly-nametest-*@example.com.
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { like } from "drizzle-orm";

const del = await db
  .delete(users)
  .where(like(users.email, "talkly-nametest-%@example.com"))
  .returning({ email: users.email });
console.log("dihapus:", del);
process.exit(0);
