import { db } from "@/firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export async function logAction(
  actionType: string,
  entity: string,
  entityId: string,
  description: string
) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    await addDoc(collection(db, "logs"), {
      actionType,
      entity,
      entityId,
      description,
      userId: user ? user.uid : "anonymous",
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Ошибка при записи лога:", error);
  }
}
