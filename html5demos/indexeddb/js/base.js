(function () {
    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
        upgradeNeededCalled = false;

    var request = indexedDB.open("elephantFiles", 1),
        db,
        putElephantInDb = function () {
            console.log("Putting elephants in IndexedDB");
            console.log("Contains elephants: " + db.objectStoreNames.contains("elephants"));
            if(!db.objectStoreNames.contains("elephants")) {
                console.log("Creating objectStore")
                db.createObjectStore("elephants");
            }

            var trans = db.transaction(["elephants"], IDBTransaction.READ_WRITE);
            console.log(trans);

            var putElephant = trans.objectStore("elephants").put("ele", "ELEPHANT");

            putElephant.onerror = function () {
               console.log("Elphant putting failed");
            };

            putElephant.onsuccess = function () {
               console.log("Success: " + putElephant.result);
            };

        };

    request.onerror = function (event) {
        console.log("Error creating IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success creating IndexedDB database");
        db = request.result;

        // For Google Chrome
        if (db.setVersion) {
            var setVersion = db.setVersion("1");
            setVersion.onsuccess = putElephantInDb;
        }
        else if (!upgradeNeededCalled) {
            // If database already exists and onupgradeneeded won't be triggered
            putElephantInDb();
        }
    }
    
    // For latest Firefox versions
    request.onupgradeneeded = function (event) {
        db = request.result;
        upgradeNeededCalled = true;
        putElephantInDb();
    };
})();
