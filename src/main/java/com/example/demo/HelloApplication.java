package com.example.demo;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;
import java.util.Set;
import java.util.HashSet;

@ApplicationPath("/api")
public class HelloApplication extends Application {

    @Override
    public Set<Class<?>> getClasses() {
        Set<Class<?>> resources = new HashSet<>();
        // Register your resource class here
        resources.add(DocumentController.class);
        resources.add(WhiteboardEndpoint.class); // Register WebSocket endpoint if it's also a JAX-RS resource
        // Add additional features or resources if needed
        return resources;
    }
}
