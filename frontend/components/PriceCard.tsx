import { useState, useEffect } from "react";
import { connectPriceWS } from "../services/ws";

export default function PriceCard() {
  const [price, setPrice] = useState<number | null>(null);
  const [symbol, setSymbol] = useState("");

  useEffect(() => {
    const ws = connectPriceWS((data) => {
      setPrice(data.price);
      setSymbol(data.symbol);
    });

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h2>{symbol}</h2>
      <p>Current Price: ${price?.toLocaleString()}</p>
    </div>
  );
}
