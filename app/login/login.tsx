"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const login = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(userCred.user.uid);

      document.cookie = `token=${await userCred.user.getIdToken()}; path=/`;

      if (role === "admin") router.push("/admin");
      else if (role === "cashier") router.push("/cashier");
      else if (role === "waiter") router.push("/waiter");
      else if (role === "kitchen") router.push("/kitchen");
      else alert("Роль не назначена");
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Неизвестная ошибка");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <input
        type="email"
        placeholder="Email"
        className="p-2 border"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Пароль"
        className="p-2 border"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
      />
      <button onClick={login} className="px-4 py-2 bg-blue-500 text-white">Войти</button>
    </div>
  );
}
