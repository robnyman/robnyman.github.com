(function () {
    // localStorage with image
    var storageFiles = JSON.parse(localStorage.getItem("storageFiles")) || {},
        elephant = document.getElementById("elephant"),
        storageFilesDate = storageFiles.date,
        date = new Date(),
        todaysDate = (date.getMonth() + 1).toString() + date.getDate().toString();

    // Compare date and create localStorage if it's not existing/too old   
    if (typeof storageFilesDate === "undefined" || storageFilesDate < todaysDate) {
        // Take action when the image has loaded
        elephant.addEventListener("load", function () {
            var imgCanvas = document.createElement("canvas"),
                imgContext = imgCanvas.getContext("2d");

            // Make sure canvas is as big as the picture
            imgCanvas.width = elephant.width;
            imgCanvas.height = elephant.height;

            // Draw image into canvas element
            imgContext.drawImage(elephant, 0, 0, elephant.width, elephant.height);

            // Save image as a data URL
            storageFiles.elephant = imgCanvas.toDataURL("image/png");

            // Set date for localStorage
            storageFiles.date = todaysDate;

            // Save as JSON in localStorage
            try {
                localStorage.setItem("storageFiles", JSON.stringify(storageFiles));
            }
            catch (e) {
                    console.log("Storage failed: " + e);                
            }
        }, false);

        // Set initial image src    
        elephant.setAttribute("src", "elephant.png");
    }
    else {
        // Use image from localStorage
        elephant.setAttribute("src", storageFiles.elephant);
    }

    // Getting a file through XMLHttpRequest as an arraybuffer and creating a Blob
    var rhinoStorage = localStorage.getItem("rhino"),
        rhino = document.getElementById("rhino");
    if (rhinoStorage) {
        // Reuse existing Data URL from localStorage
        rhino.setAttribute("src", rhinoStorage);
    }
    else {
        // Create XHR, BlobBuilder and FileReader objects
        var xhr = new XMLHttpRequest(),
            blob,
            fileReader = new FileReader();

        xhr.open("GET", "rhino.png", true);
        // Set the responseType to arraybuffer. "blob" is an option too, rendering BlobBuilder unnecessary, but the support for "blob" is not widespread enough yet
        xhr.responseType = "arraybuffer";

        xhr.addEventListener("load", function () {
            if (xhr.status === 200) {
                // Create a blob from the response
                blob = new Blob([xhr.response], {type: "image/png"});

                // onload needed since Google Chrome doesn't support addEventListener for FileReader
                fileReader.onload = function (evt) {
                    // Read out file contents as a Data URL
                    var result = evt.target.result;
                    // Set image src to Data URL
                    rhino.setAttribute("src", result);
                    // Store Data URL in localStorage
                    try {
                        localStorage.setItem("rhino", result);
                    }
                    catch (e) {
                        console.log("Storage failed: " + e);
                    }
                };
                // Load blob as Data URL
                fileReader.readAsDataURL(blob);
            }
        }, false);
        // Send XHR
        xhr.send();
    }
})();
