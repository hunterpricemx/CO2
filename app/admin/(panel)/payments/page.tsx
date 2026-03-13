import { CreditCard } from "lucide-react";
import { getPaymentConfig, getPaymentConfigHasSecrets } from "./actions";
import { PaymentsForm } from "./PaymentsForm";

export const metadata = { title: "Pagos — Admin" };

export default async function PaymentsPage() {
  const [config, hasSecrets] = await Promise.all([
    getPaymentConfig(),
    getPaymentConfigHasSecrets(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-[#f39c12]" />
        <div>
          <h1 className="text-2xl font-bebas tracking-widest text-white">Pagos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura Stripe y Tebex. Las secret keys nunca se devuelven al cliente.
          </p>
        </div>
      </div>

      <PaymentsForm initial={config} hasSecrets={hasSecrets} />
    </div>
  );
}
