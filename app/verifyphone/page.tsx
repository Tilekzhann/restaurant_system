"use client";
import { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const sendCode = async () => {
    if (typeof window === "undefined") return; // только клиент
    const user = auth.currentUser;
    if (!user) return;

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const phone = userSnap.data()?.phone;
    if (!phone) return;

    // Создаём RecaptchaVerifier один раз
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );
      await window.recaptchaVerifier.render();
    }

    const confirmation: ConfirmationResult = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );
    localStorage.setItem("confirmationResult", JSON.stringify(confirmation));
  };

  useEffect(() => {
    sendCode();
  }, []);

  const verifyCode = async () => {
    const stored = localStorage.getItem("confirmationResult");
    if (!stored) return;

    const confirmation: ConfirmationResult = JSON.parse(stored) as ConfirmationResult;

    try {
      await confirmation.confirm(code);

      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), { verified: true });
      }

      router.push("/pending");
    } catch (err: unknown) {
      setMessage((err as Error).message);
    }
  };

  return (
    <div>
      <h1>Подтверждение телефона</h1>
      {message && <p>{message}</p>}
      <div id="recaptcha-container"></div>
      <input
        type="text"
        placeholder="Введите код из SMS"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button onClick={verifyCode}>Подтвердить</button>
    </div>
  );
}
