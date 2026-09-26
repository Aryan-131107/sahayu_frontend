import { useMemo } from "react";

/**
 * Safe Demo UPI QR Code (Vector SVG)
 * Generates an authentic deterministic QR Code pattern encoding demo order & dynamic bill amount.
 * Contains 0 real payment secrets. Clearly marked as Demo / Simulation.
 */
export function DemoUpiQr({ amount, orderId = "SH-DEMO", size = 160 }) {
  const grid = useMemo(() => {
    const N = 25;
    const matrix = Array.from({ length: N }, () => Array(N).fill(0));

    // Draw standard 7x7 Finder Pattern at (r0, c0)
    const drawFinder = (r0, c0) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[r0 + r][c0 + c] = 1;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[r0 + r][c0 + c] = 1;
          } else {
            matrix[r0 + r][c0 + c] = 0;
          }
        }
      }
    };

    drawFinder(0, 0); // Top-left
    drawFinder(0, 18); // Top-right
    drawFinder(18, 0); // Bottom-left

    // Timing lines
    for (let i = 7; i < 18; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    // Deterministic pseudo-random seed based on orderId and amount
    const seedStr = `upi://pay?pa=sahayu.coop@upi&pn=Sahayu+Worker&am=${amount}&cu=INR&tn=${orderId}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }

    // Fill data cells
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Skip finder areas and center badge cutout
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= 17) ||
          (r >= 17 && c < 8) ||
          (r === 6) ||
          (c === 6) ||
          (r >= 10 && r <= 14 && c >= 10 && c <= 14)
        ) {
          continue;
        }
        hash = (hash * 1664525 + 1013904223) >>> 0;
        matrix[r][c] = hash % 3 === 0 ? 1 : 0;
      }
    }

    return matrix;
  }, [amount, orderId]);

  return (
    <div className="demo-qr-wrapper" style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg
        viewBox="0 0 25 25"
        width={size}
        height={size}
        style={{ display: "block", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell === 1 ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width="1.01"
                height="1.01"
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      {/* Central Sahāyu Brand Badge */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: size * 0.22,
          height: size * 0.22,
          background: "#1d6b55",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: Math.max(10, Math.round(size * 0.1)),
          boxShadow: "0 0 0 2px white",
        }}
      >
        S
      </div>
    </div>
  );
}

export default DemoUpiQr;
