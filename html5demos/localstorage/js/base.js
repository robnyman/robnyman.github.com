(function () {
    // localStorage
    var imgInfo = JSON.parse(localStorage.getItem("imgInfo")) || {},
        elephant = document.getElementById("elephant"),
        imgInfoDate = imgInfo.date,
        date = new Date(),
        todaysDate = (date.getMonth() + 1).toString() + date.getDate().toString();

    // Compare date and create localStorage if it's not existing/too old   
    if (typeof imgInfoDate === "undefined" || imgInfoDate < todaysDate) {
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
            imgInfo.src = imgCanvas.toDataURL("image/png");

            // Set date for localStorage
            imgInfo.date = todaysDate;

            // Save as JSON in localStorage
            localStorage.setItem("imgInfo", JSON.stringify(imgInfo));
        }, false);

        // Set initial image src    
        elephant.setAttribute("src", "elephant.png");
    }
    else {
        // Use image from localStorage
        elephant.setAttribute("src", imgInfo.src);
    }
})();
