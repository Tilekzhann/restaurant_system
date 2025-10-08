"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function VerifyPhonePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initRecaptcha = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const phone = userSnap.data()?.phone;
      if (!phone) {
        setMessage("Телефон не найден");
        return;
      }

      const container = document.getElementById("recaptcha-container");
      if (!container) return;

      // @ts-expect-error: Firebase RecaptchaVerifier принимает HTMLElement в браузере
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(container, { size: "invisible" }, auth);
        await window.recaptchaVerifier.render();
      }

      try {
        window.confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
        setReady(true);
      } catch (err: unknown) {
        setMessage((err as Error).message);
      }
    };

    initRecaptcha();
  }, []);

  const verifyCode = async () => {
    if (!window.confirmationResult) return;

    try {
      await window.confirmationResult.confirm(code);

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
    <div className="verify-phone-page">
      <h1>Подтверждение телефона</h1>
      {message && <p style={{ color: "red" }}>{message}</p>}
      <div id="recaptcha-container"></div>
      <input
        type="text"
        placeholder="Введите код из SMS"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button onClick={verifyCode} disabled={!ready}>
        Подтвердить
      </button>
    </div>
  );
}
