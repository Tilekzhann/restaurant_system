// lib/auth.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export async function getUserRole(uid: string): Promise<string | null> {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return docSnap.data().role;
  return null;
}
