# 🖥️ Frontend Design (Chat + Price UI)

## 📌 目标

- Chat AI
- 实时 BTC 价格
- WebSocket 数据展示

---

## 🧠 技术栈

- React / Next.js
- TypeScript
- WebSocket

---

## 📁 结构

frontend/
├── pages/
│   ├── index.tsx
├── components/
│   ├── ChatBox.tsx
│   ├── PriceCard.tsx
├── services/
│   ├── api.ts
│   ├── ws.ts

---

## 🌐 API

export async function askAgent(input: string) {
  const res = await fetch("http://localhost:8000/agent/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input })
  });

  return res.json();
}

---

## 📡 WebSocket

export function connectPriceWS(onMessage) {
  const ws = new WebSocket("ws://localhost:8000/ws/price");

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };

  return ws;
}

---

## 💬 Chat UI

import { useState } from "react";
import { askAgent } from "../services/api";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const send = async () => {
    const res = await askAgent(input);

    setMessages([
      ...messages,
      { role: "user", text: input },
      { role: "ai", text: res.response }
    ]);

    setInput("");
  };

  return (
    <div>
      {messages.map((m, i) => (
        <p key={i}>{m.role}: {m.text}</p>
      ))}

      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
