import { redirect } from "next/navigation";

export default function SettingsIndex() {
  redirect("/dashboard/settings/account");
}