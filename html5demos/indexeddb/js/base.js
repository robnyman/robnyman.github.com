(function () {
    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
        dbVersion = "1.0";

    // Create/open database
    var request = indexedDB.open("elephantFiles", dbVersion),
        db,
        createObjectStore = function (dataBase) {
            // Check if the desired objectStore exists - if not, create it
            if(!dataBase.objectStoreNames.contains("elephants")) {
                console.log("Creating objectStore")
                dataBase.createObjectStore("elephants");
            }
        },

        getImageFile = function () {
            // Create XHR and BlobBuilder
            var xhr = new XMLHttpRequest(),
                blobBuilder = new (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.OBlobBuilder || window.msBlobBuilder),
                blob;

            xhr.open("GET", "elephant.png", true);
            // Set the responseType to arraybuffer. "blob" is an option too, rendering BlobBuilder unnecessary, but the support for "blob" is not widespread enough yet
            xhr.responseType = "arraybuffer";

            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    // Append the response to the BlobBuilder
                    blobBuilder.append(xhr.response);
                    // Create a blob with the desired MIME type
                    blob = blobBuilder.getBlob("image/png");
                    
                    console.log("Image retrieved");

                    // Put the received blob into IndexedDB
                    putElephantInDb(blob);
                }
            }, false);
            // Send XHR
            xhr.send();
        },

        putElephantInDb = function (blob) {
            console.log("Putting elephants in IndexedDB");

            // Open a transaction to the database
            var transaction = db.transaction(["elephants"], IDBTransaction.READ_WRITE);

            // Put the blob into the dabase
            var putElephant = transaction.objectStore("elephants").put(blob, "image");

            // Operation failed
            putElephant.onerror = function () {
               console.log("Elphant putting failed");
            };

            // Operation succeded!
            putElephant.onsuccess = function () {
                console.log("Success: " + putElephant.result);

                // Retrieve the file that was just stored
                var getElephant = transaction.objectStore("elephants").get("image");

                // Failed to get elephant file in database
                getElephant.onerror = function (event) {
                    console.log("Failed to get elephant");
                };

                // Got the elephant file
                getElephant.onsuccess = function (event) {
                    var imgFile = event.target.result;
                    console.log("Got elephant!" + imgFile);

                    // Get window.URL object
                    var URL = window.URL || window.webkitURL;

                    // Create and revoke ObjectURL
                    var imgURL = URL.createObjectURL(imgFile);

                    // Set img src to ObjectURL
                    var imgElephant = document.getElementById("elephant");
                    imgElephant.setAttribute("src", imgURL);                    

                    // Revoking ObjectURL
                    URL.revokeObjectURL(imgURL);
                };
            };

        };

    request.onerror = function (event) {
        console.log("Error creating/accessing IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success creating/accessing IndexedDB database");
        db = request.result;

        // Interim solution for Google Chrome to create an objectStore. Will be deprecated
        if (db.setVersion) {
            if (db.version !== dbVersion) {
                var setVersion = db.setVersion(dbVersion);
                setVersion.onsuccess = function () {
                    createObjectStore(db);
                    getImageFile();
                };
            }
            else {
                getImageFile();
            }
        }
        else {
            getImageFile();
        }
    }
    
    // For future use. Currently only in latest Firefox versions
    request.onupgradeneeded = function (event) {
        createObjectStore(event.currentTarget.result);
    };
})();
