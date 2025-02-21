// import React, { useState, useEffect } from "react";

// interface Message {
//   id: number;
//   text: string;
//   sender: "bot" | "user";
// }

// const MedicareChat = () => {
//   const [messages, setMessages] = useState<Message[]>([
//     { id: 1, text: "Hi 👋, I'm Kari from the  Medicare Assistance Group", sender: "bot" },
//     { id: 2, text: "Could you use thousands of $$ to spend on groceries, meds, or housing? Tap Yes! 😃", sender: "bot" },
//   ]);

//   const [showButtons, setShowButtons] = useState(true);

//   const handleResponse = (response: string) => {
//     const userMessage: Message = {
//       id: messages.length + 1,
//       text: response,
//       sender: "user",
//     };

//     setMessages((prev) => [...prev, userMessage]);

//     // Bot response based on user's choice
//     if (response === "✅ Yes") {
//       setTimeout(() => {
//         setMessages((prev) => [
//           ...prev,
//           { id: prev.length + 1, text: "Great! Do you have an existing Medicare plan?", sender: "bot" },
//         ]);
//       }, 1000);
//     } else {
//       setTimeout(() => {
//         setMessages((prev) => [
//           ...prev,
//           { id: prev.length + 1, text: "Thank you for visiting. Have a great day! 😊", sender: "bot" },
//         ]);
//       }, 1000);
//       setShowButtons(false);
//     }
//   };

//   const styles: Record<string, React.CSSProperties> = {
//     chatContainer: {
//       width: "400px",
//       margin: "20px auto",
//       border: "1px solid #ddd",
//       borderRadius: "10px",
//       overflow: "hidden",
//       boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
//       fontFamily: "Arial, sans-serif",
//       backgroundColor: "#fff",
//     },
//     header: {
//       backgroundColor: "#007bff",
//       color: "#fff",
//       padding: "10px",
//       textAlign: "center" as const,
//       fontSize: "18px",
//     },
//     chatBody: {
//       padding: "15px",
//       backgroundColor: "#f9f9f9",
//       minHeight: "300px",
//       maxHeight: "400px",
//       overflowY: "auto",
//       display: "flex",
//       flexDirection: "column",
//     },
//     message: {
//       margin: "5px 0",
//       padding: "10px",
//       borderRadius: "10px",
//       maxWidth: "80%",
//       wordWrap: "break-word",
//     },
//     botMessage: {
//       backgroundColor: "#e9ecef",
//       alignSelf: "flex-start",
//     },
//     userMessage: {
//       backgroundColor: "#007bff",
//       color: "#fff",
//       alignSelf: "flex-end",
//     },
//     buttonContainer: {
//       display: "flex",
//       justifyContent: "center",
//       marginTop: "10px",
//     },
//     button: {
//       padding: "8px 12px",
//       border: "none",
//       borderRadius: "5px",
//       cursor: "pointer",
//       fontSize: "14px",
//       margin: "0 5px",
//     },
//     yesButton: {
//       backgroundColor: "#28a745",
//       color: "#fff",
//     },
//     noButton: {
//       backgroundColor: "#dc3545",
//       color: "#fff",
//     },
//   };

//   useEffect(() => {
//     const chatBody = document.getElementById("chat-body");
//     if (chatBody) {
//       chatBody.scrollTop = chatBody.scrollHeight;
//     }
//   }, [messages]);

//   return (
//     <div style={styles.chatContainer}>
//       <div style={styles.header}>Medicare Benefits Chat</div>
//       <div id="chat-body" style={styles.chatBody}>
//         {messages.map((msg) => (
//           <div
//             key={msg.id}
//             style={{
//               ...styles.message,
//               ...(msg.sender === "bot" ? styles.botMessage : styles.userMessage),
//             }}
//           >
//             {msg.text}
//           </div>
//         ))}

//         {showButtons && (
//           <div style={styles.buttonContainer}>
//             <button
//               style={{ ...styles.button, ...styles.yesButton }}
//               onClick={() => handleResponse("✅ Yes")}
//             >
//               ✅ Yes
//             </button>
//             <button
//               style={{ ...styles.button, ...styles.noButton }}
//               onClick={() => handleResponse("❌ No")}
//             >
//               ❌ No
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MedicareChat;



