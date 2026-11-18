import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP, TIP_SUGGESTIONS, type PaymentMethod } from "@rms/shared";
import { fetchOrder, fetchOrderPayments, recordPayment, requestDiscount } from "./api";
import { getErrorMessage } from "../../lib/api";
import { useSocketEvent } from "../../lib/use-socket-event";
import ReceiptView from "./ReceiptView";
import DiscountModal from "./DiscountModal";
import CustomerPicker from "./CustomerPicker";

type PaymentMode = "FULL" | "ITEMS" | "SPLIT_EVEN";

const METHOD_LABELS: Record<PaymentMethod, string> = { CASH: "Efectivo", CARD: "Tarjeta", DIGITAL: "Digital" };

export default function PaymentScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({ queryKey: ["order", orderId], queryFn: () => fetchOrder(orderId!) });
  const paymentsQuery = useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => fetchOrderPayments(orderId!),
  });

  useSocketEvent("order:payment_recorded", (payload) => {
    if (payload.orderId !== orderId) return;
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["order-payments", orderId] });
  });

  const [mode, setMode] = useState<PaymentMode>("FULL");
  // Cuantas unidades de cada linea se van a cobrar. Una linea de "4× Morrillo" puede cobrarse
  // de a uno: sin esto, la caja solo permitia cobrar los 4 de una.
  const [selectedQtyByItem, setSelectedQtyByItem] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tipAmount, setTipAmount] = useState(0);
  const [splitCount, setSplitCount] = useState(2);
  const [splitGroupId, setSplitGroupId] = useState<string | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const order = orderQuery.data;

  const unpaidItems = useMemo(
    () => (order ? order.items.filter((i) => i.status !== "CANCELLED" && !i.paidAt) : []),
    [order]
  );

  const selectedPortions = useMemo(
    () =>
      Object.entries(selectedQtyByItem)
        .filter(([, qty]) => qty > 0)
        .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    [selectedQtyByItem]
  );

  const selectedSubtotal = useMemo(() => {
    if (!order) return 0;
    return selectedPortions.reduce((sum, portion) => {
      const item = order.items.find((i) => i.id === portion.orderItemId);
      if (!item) return sum;
      const modsTotal = item.modifiers.reduce((s, m) => s + m.priceDelta, 0);
      return sum + portion.quantity * (item.unitPrice + modsTotal);
    }, 0);
  }, [order, selectedPortions]);

  const baseAmount = useMemo(() => {
    if (!order) return 0;
    if (mode === "ITEMS") return selectedSubtotal;
    if (mode === "SPLIT_EVEN") return order.totals.total / splitCount;
    return order.totals.balanceDue;
  }, [order, mode, selectedSubtotal, splitCount]);

  const paymentMutation = useMutation({
    mutationFn: () => {
      if (mode === "ITEMS") {
        return recordPayment(orderId!, { method, tipAmount, itemPortions: selectedPortions });
      }
      if (mode === "SPLIT_EVEN") {
        const groupId = splitGroupId ?? crypto.randomUUID();
        if (!splitGroupId) setSplitGroupId(groupId);
        return recordPayment(orderId!, { method, tipAmount, splitEvenly: { groupId, partsTotal: splitCount } });
      }
      return recordPayment(orderId!, { method, tipAmount });
    },
    onSuccess: () => {
      setSelectedQtyByItem({});
      setTipAmount(0);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-payments", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", "open"] });
    },
  });

  const discountMutation = useMutation({
    mutationFn: (input: { discountType: "PERCENT" | "FIXED"; value: number; reason?: string }) =>
      requestDiscount(orderId!, input),
    onSuccess: (result: { status: string }) => {
      setShowDiscountModal(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      if (result.status === "PENDING") {
        alert("Descuento enviado para aprobación del gerente/admin.");
      }
    },
  });

  if (orderQuery.isLoading || !order) {
    return <div className="p-6 text-slate-400">Cargando cuenta...</div>;
  }

  if (order.status === "CLOSED") {
    return (
      <ReceiptView
        order={order}
        payments={paymentsQuery.data ?? []}
        onBack={() => navigate("/cashier")}
      />
    );
  }

  function setSelectedQty(itemId: string, qty: number, max: number) {
    const acotada = Math.max(0, Math.min(qty, max));
    setSelectedQtyByItem((prev) => ({ ...prev, [itemId]: acotada }));
  }

  function lineTotal(item: { quantity: number; unitPrice: number; modifiers: { priceDelta: number }[] }) {
    const modsTotal = item.modifiers.reduce((s, m) => s + m.priceDelta, 0);
    return item.quantity * (item.unitPrice + modsTotal);
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <div>
        <button onClick={() => navigate("/cashier")} className="mb-4 text-slate-500 hover:text-slate-800">
          ← Volver
        </button>
        <h1 className="mb-4 text-xl font-bold text-slate-800">
          Mesa {order.tableLabel} <span className="text-slate-400 font-normal">— {order.waiterName}</span>
        </h1>

        <CustomerPicker order={order} />

        <ul className="mt-4 space-y-2">
          {order.items
            .filter((i) => i.status !== "CANCELLED")
            .map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  item.paidAt ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {mode === "ITEMS" && !item.paidAt && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedQty(item.id, (selectedQtyByItem[item.id] ?? 0) - 1, item.quantity)}
                        className="h-8 w-8 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                        aria-label={`Quitar una unidad de ${item.name}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold text-slate-800">
                        {selectedQtyByItem[item.id] ?? 0}
                      </span>
                      <button
                        onClick={() => setSelectedQty(item.id, (selectedQtyByItem[item.id] ?? 0) + 1, item.quantity)}
                        className="h-8 w-8 rounded-full bg-slate-800 font-bold text-white hover:bg-slate-700"
                        aria-label={`Cobrar una unidad de ${item.name}`}
                      >
                        +
                      </button>
                      <span className="ml-1 text-xs text-slate-400">de {item.quantity}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-800">
                      {item.quantity}× {item.name}
                      {item.isIncluded && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                          Incluida
                        </span>
                      )}
                    </p>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-slate-400">{item.modifiers.map((m) => m.name).join(", ")}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">{formatCOP(lineTotal(item))}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-slate-400">{formatCOP(lineTotal(item) / item.quantity)} c/u</p>
                  )}
                  {item.paidAt && <p className="text-xs font-semibold text-emerald-600">Pagado</p>}
                </div>
              </li>
            ))}
        </ul>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <Row label="Subtotal" value={order.totals.subtotal} />
          {order.totals.discountAmount > 0 && (
            <Row label={`Descuento${order.discountReason ? ` (${order.discountReason})` : ""}`} value={-order.totals.discountAmount} />
          )}
          <Row label="Total" value={order.totals.total} bold />
          <Row label="Ya pagado" value={order.totals.amountPaid} />
          <Row label="Saldo pendiente" value={order.totals.balanceDue} bold accent />

          {order.totals.discountAmount === 0 && (
            <button
              onClick={() => setShowDiscountModal(true)}
              className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              Solicitar descuento
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-2">
          {(["FULL", "ITEMS", "SPLIT_EVEN"] as PaymentMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m === "ITEMS" && order.totals.discountAmount > 0}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-30 ${
                mode === m ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {m === "FULL" ? "Pagar completo" : m === "ITEMS" ? "Dividir por plato" : "Partes iguales"}
            </button>
          ))}
        </div>

        {mode === "ITEMS" && (
          <p className="mb-3 text-sm text-slate-500">
            Elige cuántas unidades de cada plato vas a cobrar. Subtotal seleccionado:{" "}
            <b>{formatCOP(selectedSubtotal)}</b>
          </p>
        )}

        {mode === "SPLIT_EVEN" && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Dividir entre</span>
            <input
              type="number"
              min={2}
              value={splitCount}
              onChange={(e) => {
                setSplitCount(Math.max(2, Number(e.target.value)));
                setSplitGroupId(null);
              }}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center"
            />
            <span className="text-sm font-medium text-slate-600">personas</span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-600">Método de pago</p>
          <div className="mb-4 flex gap-2">
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                  method === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>

          <p className="mb-2 text-sm font-semibold text-slate-600">Propina</p>
          <div className="mb-2 flex gap-2">
            {TIP_SUGGESTIONS.map((pct) => (
              <button
                key={pct}
                onClick={() => setTipAmount(Number((baseAmount * pct).toFixed(2)))}
                className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                {(pct * 100).toFixed(0)}%
              </button>
            ))}
            <button
              onClick={() => setTipAmount(0)}
              className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              Sin propina
            </button>
          </div>
          <input
            type="number"
            min={0}
            step="0.01"
            value={tipAmount}
            onChange={(e) => setTipAmount(Number(e.target.value))}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-right"
          />

          <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="font-semibold text-slate-700">A cobrar</span>
            <span className="text-2xl font-bold text-slate-900">{formatCOP(baseAmount + tipAmount)}</span>
          </div>

          <button
            onClick={() => paymentMutation.mutate()}
            disabled={
              paymentMutation.isPending ||
              (mode === "ITEMS" && selectedPortions.length === 0) ||
              (mode === "FULL" && unpaidItems.length === 0)
            }
            className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40"
          >
            {paymentMutation.isPending ? "Procesando..." : "Cobrar"}
          </button>
          {paymentMutation.isError && (
            <p className="mt-2 text-sm font-medium text-red-600">{getErrorMessage(paymentMutation.error)}</p>
          )}
        </div>

        {(paymentsQuery.data?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-600">Pagos registrados</p>
            <ul className="space-y-1 text-sm">
              {paymentsQuery.data!.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-600">
                  <span>
                    {METHOD_LABELS[p.method]} {p.splitLabel ? `(${p.splitLabel})` : ""}
                  </span>
                  <span className="font-semibold">{formatCOP(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showDiscountModal && (
        <DiscountModal
          onCancel={() => setShowDiscountModal(false)}
          onConfirm={(input) => discountMutation.mutate(input)}
          isPending={discountMutation.isPending}
          error={discountMutation.isError ? getErrorMessage(discountMutation.error) : null}
        />
      )}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold" : ""} ${accent ? "text-blue-600" : "text-slate-700"}`}>
      <span>{label}</span>
      <span>{formatCOP(value)}</span>
    </div>
  );
}
