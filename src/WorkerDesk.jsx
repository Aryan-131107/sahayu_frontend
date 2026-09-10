import React, { useMemo } from "react";
import { getRateCardForBooking, getCategoryKey, RATE_CARD_CATALOG } from "./api";

/**
 * WorkerDesk Component (Modular Technician Desk)
 */
export default function WorkerDesk({
  booking,
  selectedQuoteItems = [],
  onAddQuoteItem,
  onRemoveQuoteItem,
  onUpdateQuoteQty,
  onSubmitQuote,
  quotation,
}) {
  const currentRateCard = useMemo(() => {
    return getRateCardForBooking(booking);
  }, [booking]);

  const categoryKey = getCategoryKey(booking?.service_name || booking?.service_category || booking?.category);
  const availableAddons = currentRateCard.items || RATE_CARD_CATALOG[categoryKey] || [];

  const calculateAdditional = () => {
    return selectedQuoteItems.reduce((acc, i) => acc + i.price * (i.qty || 1), 0);
  };

  return (
    <div className="worker-desk-card">
      <div className="worker-desk-header">
        <h4>Service: {booking?.service_name || currentRateCard.tradeTitle}</h4>
        <p>Skill: <strong>{currentRateCard.skillName}</strong></p>
      </div>

      <div className="rate-card-builder-box mini" style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <small style={{ fontWeight: 700, display: "block", marginBottom: "6px", color: "#334155" }}>
          Select Additional Work:
        </small>

        {availableAddons.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>
            No additional rate-card items available for this service.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {availableAddons.map((item) => {
              const selected = selectedQuoteItems.find((i) => i.id === item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: selected ? "1.5px solid #059669" : "1px solid #cbd5e1",
                    background: selected ? "#ecfdf5" : "#ffffff",
                  }}
                >
                  <div style={{ flex: 1, marginRight: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{item.title || item.name}</div>
                    <strong style={{ fontSize: "11px", color: "#059669" }}>+₹{item.price}</strong>
                  </div>

                  {onAddQuoteItem && (
                    <button
                      type="button"
                      className="secondary-btn mini-demo-btn"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={() => onAddQuoteItem(item)}
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedQuoteItems.length > 0 && onRemoveQuoteItem && (
          <div style={{ marginTop: "12px", borderTop: "1px solid #cbd5e1", paddingTop: "8px" }}>
            <small style={{ fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "4px" }}>
              Selected Additional Work:
            </small>
            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "4px 2px" }}>Item</th>
                  <th style={{ padding: "4px 2px" }}>Price</th>
                  <th style={{ padding: "4px 2px", textAlign: "center" }}>Qty</th>
                  <th style={{ padding: "4px 2px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "4px 2px", textAlign: "center" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuoteItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "4px 2px", fontWeight: 600 }}>{item.title || item.name}</td>
                    <td style={{ padding: "4px 2px" }}>₹{item.price}</td>
                    <td style={{ padding: "4px 2px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {onUpdateQuoteQty && (
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onUpdateQuoteQty(item.id, -1)}
                          >
                            -
                          </button>
                        )}
                        <span>{item.qty}</span>
                        {onUpdateQuoteQty && (
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => onUpdateQuoteQty(item.id, 1)}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                      ₹{item.price * item.qty}
                    </td>
                    <td style={{ padding: "4px 2px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="text-btn"
                        style={{ color: "#ef4444", fontSize: "11px" }}
                        onClick={() => onRemoveQuoteItem(item.id)}
                      >
                        [Remove]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748b" }}>Additional Total: </span>
                <strong style={{ color: "#059669" }}>₹{calculateAdditional()}</strong>
              </div>
              {onSubmitQuote && (
                <button
                  type="button"
                  className="primary-btn mini-demo-btn"
                  style={{ background: "#0284c7", borderColor: "#0284c7" }}
                  onClick={onSubmitQuote}
                >
                  Send for Customer Approval
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
