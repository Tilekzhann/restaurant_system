import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import serviceAccount from "@/firebase/serviceAccountKey.json"; // ✅ импорт как ES-модуль

// Инициализация, если ещё не было
if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "Не указан title или body" });
  }

  try {
    const snapshot = await admin.firestore().collection("fcm_tokens").get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: "Нет токенов для отправки" });
    }

    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Ошибка отправки уведомлений:", error);
    return res.status(500).json({ success: false, error });
  }
}
