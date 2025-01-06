import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import styles from "../css/ChatRoom.module.css";

export default function ChatRoom({
  className,
  roomId,
  roomName,
  socket,
  userId,
  userEmail,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const messageEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/rooms/${roomId}`, {
          method: 'GET',
          headers: {},
          credentials: 'include',
        });
  
        if (!response.ok) {
          console.error(`HTTP Error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error("Error response text:", errorText);
          return;
        }
  
        const data = await response.json();
        setRoomDescription(data.room.description);
      } catch (err) {
        console.error("Error fetching room details:", err);
      }
    };
  
    fetchRoomDetails();
  
    socket.emit("join-room", roomId);
  
    socket.on("previous-messages", (previousMessages) => {
      setMessages(
        previousMessages.map((msg) => ({
          ...msg,
          role: msg.role || "role",
        }))
      );
    });
  
    socket.on("receive-message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });
  
    return () => {
      socket.off("receive-message");
      socket.off("previous-messages");
    };
  }, [roomId, socket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!userId || !userEmail) {
      console.error("User is not authenticated properly");
      return;
    }

    if (newMessage.trim() === "") {
      return;
    }

    const userData = JSON.parse(Cookies.get("user") || '{}');
    const displayName = userData.displayName || userData.email;

    const messageData = {
      roomId,
      message: newMessage,
      userId,
      userEmail,
      displayName,
      role: userData.role,
    };

    socket.emit("send-message", messageData);
    setNewMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const navigateProfile = () => {
    navigate("/profile");
  };

  return (
    <div className={className}>
      <div className={styles.messageContainer}>
        <h1 className={styles.welcomeMessage}>
          You are now connected to {roomName}
        </h1>
        <h1 className={styles.roomDescription}>
          {roomDescription}
        </h1>
        {messages.map((msg, index) => (
          <div
            key={msg.createdAt || `fallback-${index}`}
            className={styles.messages}
          >
            <img
              onClick={navigateProfile}
              src={`${process.env.REACT_APP_BACKEND_URL}${msg.profilePicture}`}
              alt={msg.displayName || msg.userEmail}
              className={styles.profilePicture}
            />
            <div className={styles.msgAll}>
              <div className={styles.msgInfo}>
                <strong className={styles.name}>
                  {msg.displayName || msg.userEmail}
                </strong>
                {msg.role && (
                  <span
                    className={
                      msg.role === "admin"
                        ? styles.admin
                        : msg.role === "moderator"
                        ? styles.moderator
                        : styles.user
                    }
                  >
                    [{msg.role}]
                  </span>
                )}
              </div>
              <span className={styles.msgSpan}>{msg.message}</span>
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      <input
        className={styles.messageField}
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message:"
      />
    </div>
  );
}