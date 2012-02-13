(function () {
    // localStorage
    var imgInfo = JSON.parse(localStorage.getItem("imgInfo")) || {},
        elephant = document.getElementById("elephant"),
        imgInfoDate = imgInfo.date,
        date = new Date(),
        todaysDate = (date.getMonth() + 1).toString() + date.getDate().toString();

    // Compare date and create localStorage if it's not existing/too old   
    if (typeof imgInfoDate === "undefined" || imgInfoDate < todaysDate) {
        elephant.addEventListener("load", function () {
            var imgCanvas = document.createElement("canvas"),
                imgContext = imgCanvas.getContext("2d");

            // Make sure canvas is as big as the picture
            imgCanvas.width = elephant.width;
            imgCanvas.height = elephant.height;

            // Draw image into canvas element
            imgContext.drawImage(elephant, 0, 0, elephant.width, elephant.height);

            // Save image as a data URL
            imgInfo.src = imgCanvas.toDataURL("image/png");

            // Set date for localStorage
            imgInfo.date = todaysDate;

            // Save as JSON in localStorage
            localStorage.setItem("imgInfo", JSON.stringify(imgInfo));
        }, false);

        // Set initial image src    
        elephant.setAttribute("src", "elephant.jpg");
    }
    else {
        elephant.setAttribute("src", imgInfo.src);
    }

    // custom attributes
    var customAttributes = document.getElementById("custom-attributes"),
        attributes,
        dataset = [];
    attributes = "<br>data-type: " + customAttributes.getAttribute("data-type");
    attributes += "<br>data-value: " + customAttributes.getAttribute("data-value");
    attributes += "<br>dataset: ";
    for (var i in customAttributes.dataset) {
        dataset.push(i + ": " + customAttributes.dataset[i]);
    }
    attributes += dataset.join(", ");
    customAttributes.innerHTML += attributes;
    

    // classList
    var elm = document.getElementById("classlist-demo");
    elm.classList.add("boxy");
    elm.classList.add("pretty");
    elm.classList.remove("pretty");
    elm.classList.toggle("pretty");
    elm.innerHTML += "<br>Contains pretty: " + elm.classList.contains("pretty");
    elm.innerHTML += "<br>" + elm.classList.toString();


    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;

    var request = indexedDB.open("ABBADatabase", 2),
        db,
        customerData = [
            {
                ssn: "444-44-4444", 
                name: "Bill", 
                age: 35, 
                email: "bill@company.com"
            },
            {
                ssn: "555-55-5555", 
                name: "Donna", 
                age: 32, 
                email: "donna@home.org"
            }
        ];

    request.onerror = function (event) {
        console.log("Error creating IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success creating IndexedDB database");
        db = request.result;
    };

    request.onupgradeneeded = function (event) {
        if (typeof db !== "undefined") {
            var objectStore = db.createObjectStore("customers", {
                keyPath: "ssn"
            });

            objectStore.createIndex("name", "name", {
                unique: false
            });

            objectStore.createIndex("email", "email", {
                unique: true
            });

            for (var i in customerData) {
                objectStore.add(customerData[i]);
            }
        }
    };
})();
