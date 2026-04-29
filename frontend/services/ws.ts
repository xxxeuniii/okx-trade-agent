export function connectPriceWS(onMessage: (data: { symbol: string; price: number }) => void) {
  const ws = new WebSocket("ws://localhost:8001/ws/price");

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };

  return ws;
}
