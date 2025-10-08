"use client";

import { useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const sendCode = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await doc(db, "users", user.uid).get();
    const phone = userDoc.data()?.phone;
    if (!phone) return;

    const verifier = new RecaptchaVerifier("recaptcha-container", {}, auth);
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);

    localStorage.setItem("confirmationResult", JSON.stringify(confirmation));
  };

  const verifyCode = async () => {
    const confirmation: any = JSON.parse(localStorage.getItem("confirmationResult") || "");
    if (!confirmation) return;

    try {
      await confirmation.confirm(code);

      // Обновляем статус verified
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), { verified: true });
      }

      router.push("/pending");
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div>
      <h1>Подтверждение телефона</h1>
      {message && <p>{message}</p>}
      <div id="recaptcha-container"></div>
      <input type="text" placeholder="Введите код из SMS" value={code} onChange={e => setCode(e.target.value)} />
      <button onClick={verifyCode}>Подтвердить</button>
    </div>
  );
}
