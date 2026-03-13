import { getPackages } from "./actions";
import PackagesManager from "./PackagesManager";

export default async function AdminPackagesPage() {
  const packages = await getPackages();
  return <PackagesManager packages={packages} />;
}
