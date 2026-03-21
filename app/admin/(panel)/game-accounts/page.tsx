import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { searchGameAccounts } from "@/modules/game-accounts/queries";
import { GameAccountsManager } from "@/components/admin/GameAccountsManager";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminGameAccountsPage({ searchParams }: Props) {
  const admin = await requireAdminPanelAccess("users");
  const sp = await searchParams;

  const version = sp.version === "1" ? 1 : 2;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = 20;
  const search = sp.search?.trim() ?? undefined;
  const banned =
    sp.banned === "true" ? true : sp.banned === "false" ? false : undefined;

  let result = { data: [] as Awaited<ReturnType<typeof searchGameAccounts>>["data"], total: 0, page, pageSize };
  let dbError: string | null = null;

  try {
    result = await searchGameAccounts({ version, search, banned, page, pageSize });
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Error conectando al servidor de juego.";
  }

  return (
    <GameAccountsManager
      accounts={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      version={version}
      search={search ?? ""}
      bannedFilter={sp.banned ?? ""}
      dbError={dbError}
      adminLocale="es"
    />
  );
}
