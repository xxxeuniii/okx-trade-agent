import { useState } from "react";
import { askAgent } from "../services/api";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

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
