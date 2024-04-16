package com.example.demo;


import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;


@Path("/documents")
public class DocumentController {

    private static final String UPLOAD_DIRECTORY = "uploads";

    @POST
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadDocument(byte[] inputStream) throws IOException {
        if (inputStream.length == 0) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Empty file upload").build();
        }

        String filename = UUID.randomUUID().toString(); // Generate a unique ID
        String filePath = Paths.get(UPLOAD_DIRECTORY, filename).toString();

        try (FileOutputStream outputStream = new FileOutputStream(filePath)) {
            outputStream.write(inputStream);
        } catch (IOException e) {
            throw new IOException("Error saving uploaded file: " + e.getMessage());
        }

        // Generate a URL based on the upload directory and filename (adjust as needed)
        String fileUrl = "http://localhost:8080/documents/" + filename;

        return Response.ok(Map.of("fileUrl", fileUrl)).build(); // Return JSON with fileUrl
    }


    @GET
    @Path("/{documentId}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response viewDocument(@PathParam("documentId") String documentId) throws FileNotFoundException {
        String filePath = Paths.get(UPLOAD_DIRECTORY, documentId).toString();
        File file = new File(filePath);

        if (!file.exists()) {
            throw new FileNotFoundException("Document not found: " + documentId);
        }

        StreamingOutput stream = output -> {
            try (FileInputStream inputStream = new FileInputStream(file)) {
                int read;
                while ((read = inputStream.read()) != -1) {
                    output.write(read);
                }
            }
        };

        return Response.ok(stream, MediaType.APPLICATION_OCTET_STREAM)
                .header("Content-Disposition", "attachment; filename=\"" + documentId + "\"")
                .build();
    }


    @PUT
    @Path("/{documentId}")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    public Response updateDocument(@PathParam("documentId") String documentId, byte[] inputStream) throws IOException {
        return Response.status(Response.Status.NOT_IMPLEMENTED).build();
    }}


