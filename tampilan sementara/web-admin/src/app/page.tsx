import { redirect } from "next/navigation";

export default function Home() {
  // Panel admin dimulai dari dashboard. Bila belum ada token,
  // layout (dashboard) yang akan mengarahkan ke /login.
  redirect("/dashboard");
}
