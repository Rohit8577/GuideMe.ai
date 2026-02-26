export function toggleTutorChat() {
  const chat = document.getElementById("tutorChat");
  const button = document.getElementById("tutorToggleBtn");

  if (chat.classList.contains("opacity-0")) {
    chat.classList.remove("opacity-0", "scale-95", "pointer-events-none");
    button.classList.add("hidden");
  } else {
    chat.classList.add("opacity-0", "scale-95", "pointer-events-none");
    button.classList.remove("hidden");
  }
}

export async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  const chatBox = document.getElementById("chatMessages");

  if (message === "") return;

  // User message bubble
  const userMsg = document.createElement("div");
  userMsg.className = "bg-blue-100 p-2 rounded-lg text-right";
  userMsg.innerText = message;
  chatBox.appendChild(userMsg);

    const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
    })
    const result = await res.json();
  // Simple AI reply (demo)
  const botMsg = document.createElement("div");
  botMsg.className =
    "bg-gray-200 p-2 rounded-lg text-left max-h-[23vh] overflow-y-auto ";
  // console.log(result.text)
  botMsg.innerText = result.reply;

  setTimeout(() => {
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 500);

  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;
}

export function handleEnter(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}
