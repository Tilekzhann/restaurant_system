// app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  // Если хотите сразу на логин — redirect("/login");
  redirect("/login");
}
