package com.example.demo;


import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import com.documents4j.api.DocumentType;
import com.documents4j.api.IConverter;
import com.documents4j.job.LocalConverter;
import org.apache.pdfbox.pdmodel.PDDocument;

import java.io.*;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;


@Path("/documents")
public class DocumentController {

    private static final String UPLOAD_DIRECTORY = "uploads";

    @Context
    private UriInfo uriInfo;

    static {
        File uploadDir = new File(UPLOAD_DIRECTORY);
        if (!uploadDir.exists()) {
            boolean wasDirectoryMade = uploadDir.mkdirs();
            if (!wasDirectoryMade) {
                System.err.println("Could not create upload directory at " + uploadDir.getAbsolutePath());

            }
        }
    }

    private String createFileURL(String filename) {

        return uriInfo.getBaseUriBuilder()
                .path(DocumentController.class)
                .path(DocumentController.class, "viewDocument") // Method reference is required
                .resolveTemplate("documentId", filename)
                .build()
                .toString();
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadDocument(@FormDataParam("file") InputStream uploadedInputStream,
                                   @FormDataParam("file") FormDataContentDisposition fileDetail,
                                   @Context UriInfo uriInfo) throws IOException { // Inject UriInfo here
        if (uploadedInputStream == null || fileDetail.getFileName().trim().length() <= 0) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Invalid file upload").build();
        }

        String filename = UUID.randomUUID().toString() + getFileExtension(fileDetail.getFileName());
        String filePath = Paths.get(UPLOAD_DIRECTORY, filename).toString();


        try (FileOutputStream outputStream = new FileOutputStream(filePath)) {
            byte[] buffer = new byte[1024];
            int bytes;
            while ((bytes = uploadedInputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytes);
            }
        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Error saving uploaded file: " + e.getMessage()).build();
        }


        String fileUrl = createFileURL(filename);



        if (getFileExtension(fileDetail.getFileName()).matches("\\.(doc|docx)$")) {
            String convertedFilePath = convertToPDF(filePath);
            fileUrl = createFileURL(new File(convertedFilePath).getName());
        }

        return Response.ok(Map.of("fileUrl", fileUrl)).build();
    }






    private String getFileExtension(String fileName) {
        int lastIndex = fileName.lastIndexOf('.');
        if (lastIndex == -1) {
            return ""; // empty extension
        }
        return fileName.substring(lastIndex);
    }


    private String convertToPDF(String inputFilePath) {
        String outputFilePath = inputFilePath.substring(0, inputFilePath.lastIndexOf('.')) + ".pdf";
        File outputFile = new File(outputFilePath);

        try (InputStream in = new FileInputStream(inputFilePath);
             OutputStream out = new FileOutputStream(outputFile)) {

            IConverter converter = LocalConverter.builder().build();

            Future<Boolean> conversion = converter
                    .convert(in).as(DocumentType.MS_WORD)
                    .to(out).as(DocumentType.PDF)
                    .schedule();

            conversion.get(30, TimeUnit.SECONDS);
            converter.shutDown(); // Manually shut down the converter

        } catch (Exception e) {
            throw new WebApplicationException("Could not convert document to PDF", e);
        }

        // Optionally delete the original Word document if the conversion is successful and you no longer need it
        // Files.deleteIfExists(Paths.get(inputFilePath));

        return outputFilePath;
    }

    @GET
    @Path("/{documentId}")
    @Produces("application/pdf")
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

        return Response.ok(stream)
                .header("Content-Disposition", "inline; filename=\"" + new File(filePath).getName() + "\"")
                .build();
    }


    @PUT
    @Path("/{documentId}")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    public Response updateDocument(@PathParam("documentId") String documentId, byte[] inputStream) throws IOException {
        return Response.status(Response.Status.NOT_IMPLEMENTED).build();
    }


    @GET
    @Path("/{documentId}/content")
    @Produces(MediaType.TEXT_PLAIN)
    public Response getDocumentContent(@PathParam("documentId") String documentId) throws IOException {
        String filePath = Paths.get(UPLOAD_DIRECTORY, documentId).toString();
        File file = new File(filePath);

        if (!file.exists()) {
            throw new FileNotFoundException("Document not found: " + documentId);
        }

        String content;
        String extension = getFileExtension(file.getName());
        if (extension.equals(".txt")) {
            content = readTextFileContent(file);
        } else {

            return Response.status(Response.Status.UNSUPPORTED_MEDIA_TYPE)
                    .entity("Unsupported file type: " + extension).build();
        }

        return Response.ok(content).build();
    }

    private String readTextFileContent(File file) throws IOException {
        StringBuilder contentBuilder = new StringBuilder();
        try (FileReader reader = new FileReader(file)) {
            int character;
            while ((character = reader.read()) != -1) {
                contentBuilder.append((char) character);
            }
        }
        return contentBuilder.toString();
    }
}


