(function () {
    // localStorage
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
            localStorage.setItem("storageFiles", JSON.stringify(storageFiles));
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
        rhino.setAttribute("src", rhinoStorage);
    }
    else {
        var xhr = new XMLHttpRequest(),
            blobBuilder = new (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.OBlobBuilder || window.msBlobBuilder),
            blob,
            fileReader = new FileReader();

        xhr.open("GET", "rhino.png", true);
        xhr.responseType = "arraybuffer";

        xhr.addEventListener("load", function () {
            if (xhr.status === 200) {
                blobBuilder.append(xhr.response);
                blob = blobBuilder.getBlob("image/png");

                // onload needed since Google Chrome doesn't support addEventListener for FileReader
                fileReader.onload = function (evt) {
                    var result = evt.target.result; 
                    rhino.setAttribute("src", result);
                    storageFiles.rhino = result;
                    localStorage.setItem("rhino", result);
                };
                fileReader.readAsDataURL(blob);
            }
        }, false);

        xhr.send();
    }
})();
