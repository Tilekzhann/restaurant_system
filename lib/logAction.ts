// /lib/logAction.ts
import { db } from "@/firebase/config";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Логирует действия пользователя в коллекцию "logs"
 * @param action — тип действия (например: create_order, login, update_stock)
 * @param targetType — объект действия (order, menu, stock, auth)
 * @param targetId — ID объекта
 * @param details — дополнительная информация (опционально)
 */
export async function logAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: string
) {
  const auth = getAuth();
  const user = auth.currentUser;

  try {
    await addDoc(collection(db, "logs"), {
      userId: user?.uid || "anonymous",
      email: user?.email || "unknown",
      action,
      targetType,
      targetId,
      details,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Ошибка логирования:", error);
  }
}

