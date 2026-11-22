import { getCompanySettings } from "@/lib/db/data-store";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getCompanySettings();
  return <SettingsView initialSettings={settings} />;
}
