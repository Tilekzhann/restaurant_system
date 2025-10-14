"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const login = async () => {
    setError("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(userCred.user.uid);

      document.cookie = `token=${await userCred.user.getIdToken()}; path=/`;

      if (role && ["admin", "cashier", "kitchen"].includes(role)) {
        router.push("/orders");
      } else {
        alert("Роль не назначена");
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Неизвестная ошибка");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
      <h1 className="text-2xl font-semibold">Вход в систему</h1>

      <input
        type="email"
        placeholder="Email"
        className="p-2 border rounded w-64"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Пароль"
        className="p-2 border rounded w-64"
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={login}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded w-64"
      >
        Войти
      </button>

      <p className="text-sm text-gray-700">
        Нет аккаунта?{" "}
        <a href="/register" className="text-blue-600 hover:underline">
          Зарегистрироваться
        </a>
      </p>
    </div>
  );
}
