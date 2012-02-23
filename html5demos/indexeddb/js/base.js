(function () {
    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;

    var request = indexedDB.open("elephantFiles", 1),
        db,
        createObjectStore = function (dataBase) {
            if(!dataBase.objectStoreNames.contains("elephants")) {
                console.log("Creating objectStore")
                dataBase.createObjectStore("elephants");
            }
        },
        getImageFile = function () {
            // Create XHR, BlobBuilder and FileReader objects
            var xhr = new XMLHttpRequest(),
                blobBuilder = new (window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.OBlobBuilder || window.msBlobBuilder),
                blob,
                fileReader = new FileReader();

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
                    putElephantInDb(blob);
                }
            }, false);
            // Send XHR
            xhr.send();
        },
        putElephantInDb = function (blob) {
            console.log("Putting elephants in IndexedDB");

            var transaction = db.transaction(["elephants"], IDBTransaction.READ_WRITE);
            var putElephant = transaction.objectStore("elephants").put(blob, "image");

            putElephant.onerror = function () {
               console.log("Elphant putting failed");
            };

            putElephant.onsuccess = function () {
               console.log("Success: " + putElephant.result);
               var getElephant = transaction.objectStore("elephants").get("image");
               getElephant.onsuccess = function (event) {
                   console.log("Got elephant!" + event.target.result);
               };
            };

        };

    request.onerror = function (event) {
        console.log("Error creating IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success accessing IndexedDB database");
        db = request.result;

        // For Google Chrome
        if (db.setVersion) {
            var setVersion = db.setVersion("1");
            setVersion.onsuccess = function () {
                createObjectStore(db);
                getImageFile();
            };
        }
        else {
            getImageFile();
        }
    }
    
    // For latest Firefox versions
    request.onupgradeneeded = function (event) {
        createObjectStore(event.currentTarget.result);
    };
})();
