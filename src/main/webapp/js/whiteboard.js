// Set up the canvas
const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');
let painting = false;
let erasing = false;
let startX, startY; // Starting position of the shape
let shape = 'line';
let color = 'black';
let drawing = false;

const webSocket = new WebSocket('ws://localhost:8080/whiteboard');

webSocket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    if (message.type === 'new_document') {
        const displayContainer = document.getElementById('fileDisplayContainer');
        displayContainer.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100vh';
        iframe.src = message.fileUrl; // Use the URL from the server's message.
        displayContainer.appendChild(iframe);
    } else if (message.type === 'user_draw') {
        // Handle drawing updates from other users (code added below)
        context.beginPath();
        context.strokeStyle = message.color;
        context.lineWidth = message.lineWidth;
        context.moveTo(message.startX, message.startY);
        context.lineTo(message.endX, message.endY);
        context.stroke();
    }
};


document.addEventListener('DOMContentLoaded', function() {


    document.getElementById('color-select').addEventListener('change', function (e) {
        color = e.target.value;
    });


    document.getElementById('toggleErase').addEventListener('click', function () {
        erasing = !erasing;
        if (!erasing) {
            context.globalCompositeOperation = 'source-over';
        } else {
            context.globalCompositeOperation = 'destination-out'; // Erasing mode
            context.lineWidth = 10; // Fixed eraser size
        }
        this.textContent = erasing ? 'Stop Erase' : 'Erase';
    });

    document.getElementById('draw-btn').addEventListener('click', function () {
        drawing = !drawing; // Toggle the drawing mode
        this.textContent = drawing ? 'Stop Drawing' : 'Draw'; // Update button text
    });


    document.getElementById('eraseAll').addEventListener('click', clearCanvas);

    document.getElementById('toggleCanvas').addEventListener('click', function () {
        canvas.style.display = (canvas.style.display === 'none') ? 'block' : 'none';
    });

    document.getElementById('fileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            fetch('/documents/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server returned ' + response.status + ': ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.fileUrl) {
                        throw new Error('File URL is missing in the response');
                    }


                    webSocket.send(JSON.stringify({ type: 'new_document', fileUrl: data.fileUrl }));


                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                });
        }
    });



    canvas.addEventListener('mousedown', function(e) {
        startPosition(e);
        // Add draw to the animation frame for better performance and smoothness
        requestAnimationFrame(draw);
    });
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mousemove', draw);


    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

});




function drawShape(x, y) {
    context.beginPath();

    if (shape === 'rectangle') {
        let width = x - startX;
        let height = y - startY;
        context.fillStyle = 'transparent';
        context.strokeStyle = 'black';
        context.rect(startX, startY, width, height);
        context.fill();
        context.stroke();
    } else if (shape === 'circle') {
        let radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        context.fillStyle = 'transparent';
        context.strokeStyle = 'black';
        context.arc(startX, startY, radius, 0, Math.PI * 2, false);
        context.fill();
        context.stroke();
    }

    context.closePath();
}


function startPosition(e) {
    if (!drawing && !erasing) return;
    painting = true;
    startX = e.clientX - canvas.getBoundingClientRect().left;
    startY = e.clientY - canvas.getBoundingClientRect().top;
    context.beginPath();
    context.moveTo(startX, startY);
}


function finishedPosition() {
    if (painting) {
        painting = false;
        context.closePath();
    }
}


function draw(e) {
    if (!painting) return;

    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.lineWidth = 5;
    context.strokeStyle = color;


    let endX = e.clientX - canvas.getBoundingClientRect().left;
    let endY = e.clientY - canvas.getBoundingClientRect().top;


    interpolateLine(startX, startY, endX, endY, context.lineWidth);


    startX = endX;
    startY = endY;
}

function interpolateLine(startX, startY, endX, endY, lineWidth) {
    // Distance between points
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));


    const density = lineWidth / 2;
    const interpolations = distance / density;

    for (let i = 1; i <= interpolations; i++) {
        const x = startX + (endX - startX) * (i / interpolations);
        const y = startY + (endY - startY) * (i / interpolations);

        context.lineTo(x, y);
        context.stroke();

        context.beginPath();
        context.moveTo(x, y);
    }
}




function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50;
    clearCanvas();
}















// // Set up the canvas
// const canvas = document.getElementById('whiteboard');
// const context = canvas.getContext('2d');
// let painting = false;
// let erasing = false;
// let startX, startY; // Starting position of the shape
// let shape = 'line';
// let color = 'black';
// let drawing = false; // Flag to check if drawing mode is on
//
// const webSocket = new WebSocket('ws://localhost:8080/whiteboard');
//
// webSocket.onmessage = function(event) {
//     const message = JSON.parse(event.data);
//     if (message.type === 'new_document') {
//         const displayContainer = document.getElementById('fileDisplayContainer');
//         displayContainer.innerHTML = ''; // Clear any previous content
//
//         const iframe = document.createElement('iframe');
//         iframe.style.width = '100%';
//         iframe.style.height = '100vh';
//         iframe.src = message.fileUrl; // Use the URL from the server's message.
//         displayContainer.appendChild(iframe);
//     }
// };
//
// // Ensure all DOM elements are loaded before executing
// document.addEventListener('DOMContentLoaded', function() {
//
//     // Update the current drawing color
//     document.getElementById('color-select').addEventListener('change', function (e) {
//         color = e.target.value;
//     });
//
//     // Toggle between erasing and drawing - Demi
//     document.getElementById('toggleErase').addEventListener('click', function () {
//         erasing = !erasing;
//         if (!erasing) {
//             context.globalCompositeOperation = 'source-over';
//         } else {
//             context.globalCompositeOperation = 'destination-out'; // Erasing mode
//             context.lineWidth = 10; // Fixed eraser size
//         }
//         this.textContent = erasing ? 'Stop Erase' : 'Erase';
//     });
//
//     // Toggle drawing mode
//     document.getElementById('draw-btn').addEventListener('click', function () {
//         drawing = !drawing; // Toggle the drawing mode
//         this.textContent = drawing ? 'Stop Drawing' : 'Draw'; // Update button text
//     });
//
//     // Attach the clearCanvas function to the eraseAll button
//     document.getElementById('eraseAll').addEventListener('click', clearCanvas);
//
//     // Function to toggle the canvas visibility
//     document.getElementById('toggleCanvas').addEventListener('click', function () {
//         canvas.style.display = (canvas.style.display === 'none') ? 'block' : 'none';
//     });
//
//     document.getElementById('fileInput').addEventListener('change', function (event) {
//         const file = event.target.files[0];
//         if (file) {
//             const formData = new FormData();
//             formData.append('file', file);
//
//             fetch('/documents/upload', {
//                 method: 'POST',
//                 body: formData
//             })
//                 .then(response => {
//                     if (!response.ok) {
//                         throw new Error('Server returned ' + response.status + ': ' + response.statusText);
//                     }
//                     return response.json(); // Here we expect the server to send back a JSON response.
//                 })
//                 .then(data => {
//                     if (!data.fileUrl) {
//                         throw new Error('File URL is missing in the response');
//                     }
//                     // WebSocket message handler will take care of displaying the document
//                 })
//                 .catch(error => {
//                     console.error('Error uploading file:', error);
//                 });
//         }
//     });
//
//
//
// // Event listeners for mouse interaction with the canvas
//     canvas.addEventListener('mousedown', function(e) {
//         startPosition(e);
//         // Add draw to the animation frame for better performance and smoothness
//         requestAnimationFrame(draw);
//     });
//     canvas.addEventListener('mouseup', finishedPosition);
//     canvas.addEventListener('mousemove', draw);
//
//     // Handle the resizing of the canvas
//     window.addEventListener('resize', resizeCanvas);
//     resizeCanvas();
//
// });
//
//
//
//
// function drawShape(x, y) {
//     context.beginPath();
//
//     if (shape === 'rectangle') {
//         let width = x - startX;
//         let height = y - startY;
//         // Set fill to transparent and stroke to black for the rectangle
//         context.fillStyle = 'transparent';
//         context.strokeStyle = 'black';
//         context.rect(startX, startY, width, height);
//         context.fill();
//         context.stroke();
//     } else if (shape === 'circle') {
//         let radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
//         // Set fill to transparent and stroke to black for the circle
//         context.fillStyle = 'transparent';
//         context.strokeStyle = 'black';
//         context.arc(startX, startY, radius, 0, Math.PI * 2, false);
//         context.fill();
//         context.stroke();
//     }
//     // Add other shapes as needed
//
//     context.closePath(); // Close the path of the shape
// }
//
//
// function startPosition(e) {
//     if (!drawing && !erasing) return;
//     painting = true;
//     // Convert the mouse position to canvas coordinates
//     startX = e.clientX - canvas.getBoundingClientRect().left;
//     startY = e.clientY - canvas.getBoundingClientRect().top;
//     // Begin the drawing path
//     context.beginPath();
//     context.moveTo(startX, startY);
// }
//
//
// function finishedPosition() {
//     if (painting) {
//         painting = false;
//         context.closePath();
//     }
// }
//
// // Draw on the canvas
// function draw(e) {
//     if (!painting) return;
//
//     context.lineJoin = 'round';
//     context.lineCap = 'round';
//     context.lineWidth = 5;
//     context.strokeStyle = color;
//
//     // End point of the current line segment
//     let endX = e.clientX - canvas.getBoundingClientRect().left;
//     let endY = e.clientY - canvas.getBoundingClientRect().top;
//
//     // Interpolate line between last point and current point to avoid gaps
//     interpolateLine(startX, startY, endX, endY, context.lineWidth);
//
//     // Update start position for next segment
//     startX = endX;
//     startY = endY;
// }
//
// function interpolateLine(startX, startY, endX, endY, lineWidth) {
//     // Distance between points
//     const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
//
//     // The number of interpolations depends on the distance and the desired density
//     const density = lineWidth / 2; // density of the interpolation
//     const interpolations = distance / density;
//
//     // Draw points of the line
//     for (let i = 1; i <= interpolations; i++) {
//         const x = startX + (endX - startX) * (i / interpolations);
//         const y = startY + (endY - startY) * (i / interpolations);
//
//         context.lineTo(x, y);
//         context.stroke();
//
//         context.beginPath();
//         context.moveTo(x, y);
//     }
// }
//
//
//
// // Dynamically adjust the canvas size when the window is resized
//
// function clearCanvas() {
//     context.clearRect(0, 0, canvas.width, canvas.height);
//     context.beginPath(); // Reset the path so the old drawings don't reappear after clearing
// }
//
// function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight - 50; // Adjust for any UI outside the canvas
//     clearCanvas(); // Clear the canvas and redraw content on resize to avoid scaling
// }
//
//
//
//
//
//
