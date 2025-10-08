"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    if (!email || !password || !name || !phone) {
      setMessage("❗ Заполните все поля");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        email,
        name,
        phone,
        role: "pending",  // пользователь ждёт подтверждения
        verified: false,
        createdAt: Timestamp.now(),
      });

      // Редирект на подтверждение телефона
      router.push("/verify-phone");
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div className="register-page">
      <h1>Регистрация</h1>
      {message && <p>{message}</p>}
      <input type="text" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
      <input type="tel" placeholder="+7 701 123 45 67" value={phone} onChange={e => setPhone(e.target.value)} />
      <button onClick={handleRegister}>Зарегистрироваться</button>
    </div>
  );
}
