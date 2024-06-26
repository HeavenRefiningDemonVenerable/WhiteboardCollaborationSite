// Set up the canvas
const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');
let painting = false;
let erasing = false;
let startX, startY; // Starting position of the shape
let shape = 'line';
let color = 'black';
let drawing = false;

const webSocket = new WebSocket('ws://localhost:8080/demo-1.0-SNAPSHOT/whiteboard');

webSocket.onopen = function(){
    console.log("WebSocket connection opened");
}

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
    } else if (message.type === 'draw') {
        context.beginPath();
        context.strokeStyle = message.color;
        context.lineWidth = message.lineWidth;
        context.moveTo(message.startX, message.startY);
        context.lineTo(message.endX, message.endY);
        context.stroke();
    }  else if (message.type === "erase_all"){
        // clear the canvas
        clearCanvas();
    } else if (message.type === 'document_content') {

        const displayContainer = document.getElementById('fileDisplayContainer');
        displayContainer.innerHTML = '';

        if (message.contentType === 'text/plain') {
            displayContainer.innerText = message.content;
        } else {

            console.warn('Unsupported content type:', message.contentType);
        }
    }
};

webSocket.onclose = function (){
    webSocket.close();
}

document.addEventListener('DOMContentLoaded', function() {


    document.getElementById('color-select').addEventListener('change', function (e) {
        color = e.target.value;
    });


    document.getElementById('toggleErase').addEventListener('click', function () {
        erasing = !erasing;
        if (!erasing) {
            context.globalCompositeOperation = 'source-over';
        } else {
            context.globalCompositeOperation = 'destination-out';
            context.lineWidth = 10;
        }
        this.textContent = erasing ? 'Stop Erase' : 'Erase';
    });

    document.getElementById('draw-btn').addEventListener('click', function () {
        drawing = !drawing; // Toggle the drawing mode
        this.textContent = drawing ? 'Stop Drawing' : 'Draw'; // Update button text
    });


    document.getElementById('eraseAll').addEventListener('click', function () {
        // send message to the server to erase the canvas
        webSocket.send(JSON.stringify({type: 'erase_all'}));
        // clear local canvas
        clearCanvas();
    });

    document.getElementById('toggleCanvas').addEventListener('click', function () {
        canvas.style.display = (canvas.style.display === 'none') ? 'block' : 'none';
    });

    document.getElementById('uploadBtn').addEventListener('click', function () {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            fetch('/demo-1.0-SNAPSHOT/api/documents', {
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

                    const displayContainer = document.getElementById('fileDisplayContainer');
                    displayContainer.innerHTML = '';
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = '100vh';
                    iframe.src = data.fileUrl; // Display the uploaded file by setting the src of the iframe
                    displayContainer.appendChild(iframe);


                    webSocket.send(JSON.stringify({ type: 'new_document', fileUrl: data.fileUrl }));
                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                });
        }
    });

    document.getElementById('fileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);


            fetch('/demo-1.0-SNAPSHOT/api/documents', {
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

    // Check if startX and startY are not null
    if (startX !== null && startY !== null) {
        //send the drawing to the server
        webSocket.send(JSON.stringify({
            type: 'draw',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: color,
            lineWidth: context.lineWidth
        }));

        //update local canvas
        interpolateLine(startX, startY, endX, endY, context.lineWidth);

        startX = endX; // Update startX for the next segment
        startY = endY; // Update startY for the next segment
    }
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