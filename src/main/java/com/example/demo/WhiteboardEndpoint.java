package com.example.demo;

import jakarta.json.JsonObject;
import jakarta.json.JsonValue;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/whiteboard")
public class WhiteboardEndpoint {

    private static final Set<Session> sessions = ConcurrentHashMap.newKeySet();
    private static final Jsonb jsonb = JsonbBuilder.create();

    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        System.out.println("New websocket connection. ");
        session.getAsyncRemote().sendText("{\"message\":\"Welcome to the whiteboard.\"}");
    }

    @OnMessage
    public void onMessage(String message, Session session) throws IOException {
        try {
            Jsonb jsonb = JsonbBuilder.create();
            JsonObject jsonObject = jsonb.fromJson(message, JsonObject.class);
            String type = jsonObject.getString("type");
            System.out.println("Message type: " + type);

            switch (type) {
                case "draw":
                    broadcast(message, session);
                    break;
                case "document":
                    broadcast(message, session);
                case "erase_all":
                    broadcast(message, session);
                default:
                    break;
            }
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

    public static void broadcast(String message, Session sender) {
        if (message != null) { // Check if message is not null
            try {
                JsonValue jsonValue = jsonb.fromJson(message, JsonValue.class);
                if (jsonValue != null && jsonValue.getValueType() == JsonValue.ValueType.OBJECT) {
                    JsonObject jsonMessage = (JsonObject) jsonValue;
                    boolean isValid = true;
                    for (Map.Entry<String, JsonValue> entry : jsonMessage.entrySet()) {
                        if (!"type".equals(entry.getKey()) && entry.getValue().getValueType() == JsonValue.ValueType.NULL) {
                            isValid = false;
                            break;
                        }
                    }
                    // Broadcast the message only if all relevant values are not null
                    if (isValid) {
                        for (Session session : sessions) {
                            if (session.isOpen() && !session.equals(sender)) {
                                System.out.print("Message sent from server: " + message);
                                session.getAsyncRemote().sendText(message);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error processing message: " + e.getMessage());
            }
        }
    }



    private class Message {
        public String type;
        public String content;

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
