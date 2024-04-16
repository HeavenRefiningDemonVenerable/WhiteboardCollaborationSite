package com.example.demo;

import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/whiteboard")
public class WhiteboardEndpoint {

    private static final Set<Session> sessions = ConcurrentHashMap.newKeySet();
    private static final Jsonb jsonb = JsonbBuilder.create();

    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        session.getAsyncRemote().sendText("{\"message\":\"Welcome to the whiteboard.\"}");
    }

    @OnMessage
    public void onMessage(String message, Session session) throws IOException {
        try {
            Message msg = jsonb.fromJson(message, Message.class);
            switch (msg.getType()) {
                case "draw":
                    break;
                case "document":
                    break;
                default:

                    break;
            }
            broadcast(message);
        } catch (Exception e) {
            System.err.println("Error processing message: " + e.getMessage());
        }
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        System.err.println("WebSocket error in session " + session.getId() + ": " + throwable.getMessage());
        if (session.isOpen()) {
            session.getAsyncRemote().sendText("{\"error\":\"An error occurred. Please try again.\"}");
        }
    }

    public static void broadcast(String message) {
        for (Session session : sessions) {
            if (session.isOpen()) {
                session.getAsyncRemote().sendText(message);
            }
        }
    }

    private class Message {
        private String type;
        private String content;

        public Message() {}

        public Message(String type, String content) {
            this.type = type;
            this.content = content;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
