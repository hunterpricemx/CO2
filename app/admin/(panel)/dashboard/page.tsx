import { CalendarDays, BookOpen, Wrench, CreditCard, Users } from "lucide-react";

async function getCount(table: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=count`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        Prefer: "count=exact",
        "Range-Unit": "items",
        Range: "0-0",
      },
      next: { revalidate: 60 },
    },
  );
  const range = res.headers.get("content-range");
  return range ? parseInt(range.split("/")[1] ?? "0") : 0;
}

async function getAdminCount() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?role=eq.admin&select=count`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        Prefer: "count=exact",
        "Range-Unit": "items",
        Range: "0-0",
      },
      next: { revalidate: 60 },
    },
  );
  const range = res.headers.get("content-range");
  return range ? parseInt(range.split("/")[1] ?? "0") : 0;
}

export default async function AdminDashboardPage() {
  const [events, guides, fixes, donations, admins] = await Promise.all([
    getCount("events"),
    getCount("guides"),
    getCount("fixes"),
    getCount("donations"),
    getAdminCount(),
  ]);

  const cards = [
    { label: "Admins Panel", value: admins, icon: Users, color: "text-blue-400" },
    { label: "Eventos", value: events, icon: CalendarDays, color: "text-[#f39c12]" },
    { label: "Guías", value: guides, icon: BookOpen, color: "text-green-400" },
    { label: "Fixes", value: fixes, icon: Wrench, color: "text-purple-400" },
    { label: "Donaciones", value: donations, icon: CreditCard, color: "text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-bebas text-5xl tracking-wider text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen del servidor</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-5 flex flex-col gap-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
