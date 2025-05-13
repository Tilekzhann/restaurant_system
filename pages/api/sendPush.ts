// pages/api/sendPush.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { title, body, role } = req.body;

  const snapshot = await admin.firestore()
    .collection("fcm_tokens")
    .where("role", "==", role)
    .get();

  const tokens = snapshot.docs.map((doc) => doc.data().token).filter(Boolean);

  if (!tokens.length) {
    return res.status(200).json({ success: true, message: "Нет токенов" });
  }

  const message = {
    notification: { title, body },
    tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Ошибка FCM:", error);
    res.status(500).json({ success: false, error });
  }
}
