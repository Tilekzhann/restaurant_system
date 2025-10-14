"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
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
      if (!user) {
        setMessage("Пользователь не найден. Перезайдите в систему.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const phone = userSnap.data()?.phone;

      if (!phone) {
        setMessage("Телефон не найден в профиле.");
        return;
      }

      // создаём reCAPTCHA (один раз)
      if (!window.recaptchaVerifier) {
        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
        window.recaptchaVerifier = verifier;
        await verifier.render();
      }

      try {
        // 🔹 привязываем телефон к текущему пользователю, а не создаём нового
        const confirmation = await linkWithPhoneNumber(
          user,
          phone,
          window.recaptchaVerifier
        );
        window.confirmationResult = confirmation;
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
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          await updateDoc(userRef, { verified: true });
        } else {
          await setDoc(userRef, { verified: true }, { merge: true });
        }
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
