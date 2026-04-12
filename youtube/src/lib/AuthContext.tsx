import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, createContext, useEffect, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

type UserContextType = {
  user: any;
  login: (userdata: any) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
  mounted: boolean;
  theme: "light" | "dark";
};

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch theme on load
    fetchTheme();
    // Refresh every minute to catch 10AM-12PM window
    const interval = setInterval(fetchTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTheme = async () => {
    try {
      const res = await axiosInstance.get("/otp/theme");
      setTheme(res.data.theme);
    } catch {
      setTheme("dark");
    }
  };

  const login = (userdata: any) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  // ── Trigger OTP after Google login ────────────────────────────────────────
  const triggerOTP = async (email: string, name: string) => {
    try {
      const res = await axiosInstance.post("/otp/send", { email, name });
      // Fire custom event so _app.tsx can show OTP modal
      window.dispatchEvent(new CustomEvent("otp-required", {
        detail: {
          email,
          name,
          method: res.data.method,
          theme: res.data.theme,
        },
      }));
      // Also update theme from response
      if (res.data.theme) setTheme(res.data.theme);
    } catch (error) {
      console.error("OTP send error:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };

      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);

      // Trigger OTP verification after login
      await triggerOTP(
        firebaseuser.email as string,
        firebaseuser.displayName as string
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (!firebaseuser) return;
      try {
        const payload = {
          email: firebaseuser.email,
          name: firebaseuser.displayName,
          image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        };
        const response = await axiosInstance.post("/user/login", payload);
        login(response.data.result);
      } catch (error) {
        console.error(error);
        logout();
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin, mounted, theme }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};