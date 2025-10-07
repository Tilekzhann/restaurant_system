import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const role = await getUserRole(user.uid);
    if (role === "admin") {
      setIsAdmin(true);

      // Логируем вход админа
      await setDoc(doc(db, "logs", `${user.uid}-${Date.now()}`), {
        userId: user.uid,
        email: user.email,
        action: "Вход в админ-панель",
        targetType: "AdminGuard",
        targetId: null,
        details: null,
        timestamp: Timestamp.now(),
      });
      
    } else {
      router.replace("/"); 
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, [router]);
