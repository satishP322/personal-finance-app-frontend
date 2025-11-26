import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get("token"); // check if user is logged in

  if (token) {
    redirect("/dashboard"); // user is logged in → go to dashboard
  } else {
    redirect("/login"); // not logged in → go to login page
  }

  return null; // nothing to render, redirect happens immediately
}
