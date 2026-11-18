import { formatCOP, type OrderDTO, type PaymentDTO, type PaymentMethod } from "@rms/shared";

const METHOD_LABELS: Record<PaymentMethod, string> = { CASH: "Efectivo", CARD: "Tarjeta", DIGITAL: "Digital" };

export default function ReceiptView({
  order,
  payments,
  onBack,
}: {
  order: OrderDTO;
  payments: PaymentDTO[];
  onBack: () => void;
}) {
  const totalTip = payments.reduce((sum, p) => sum + p.tipAmount, 0);

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-4 flex gap-2 print:hidden">
        <button onClick={onBack} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-600">
          ← Volver a cuentas
        </button>
        <button onClick={() => window.print()} className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white">
          Imprimir recibo
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 font-mono text-sm">
        <p className="text-center text-lg font-bold">Recibo</p>
        <p className="text-center text-slate-500">Mesa {order.tableLabel}</p>
        <p className="text-center text-slate-500">Mesero: {order.waiterName}</p>
        {order.customerName && (
          <p className="text-center text-slate-500">
            Cliente: {order.customerName} (+{Math.floor(order.totals.total)} pts)
          </p>
        )}
        <hr className="my-3 border-dashed" />

        {order.items
          .filter((i) => i.status !== "CANCELLED")
          .map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatCOP(item.unitPrice * item.quantity)}</span>
            </div>
          ))}

        <hr className="my-3 border-dashed" />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCOP(order.totals.subtotal)}</span>
        </div>
        {order.totals.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>-{formatCOP(order.totals.discountAmount)}</span>
          </div>
        )}
        {totalTip > 0 && (
          <div className="flex justify-between">
            <span>Propina</span>
            <span>{formatCOP(totalTip)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-slate-300 pt-1 font-bold">
          <span>Total pagado</span>
          <span>{formatCOP(order.totals.total + totalTip)}</span>
        </div>

        <hr className="my-3 border-dashed" />
        <p className="mb-1 font-semibold">Pagos</p>
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>
              {METHOD_LABELS[p.method]} {p.splitLabel ? `(${p.splitLabel})` : ""} — {p.createdByName}
            </span>
            <span>{formatCOP(p.amount)}</span>
          </div>
        ))}

        <p className="mt-4 text-center text-xs text-slate-400">
          {new Date(order.createdAt).toLocaleString("es")}
        </p>
      </div>
    </div>
  );
}
