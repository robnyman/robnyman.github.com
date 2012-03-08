(function () {
    var takePicture = document.querySelector("#take-picture");
        showPicture = document.querySelector("#show-picture");

    if (takePicture && showPicture) {
        // Set events
        takePicture.onchange = function (event) {
            var files = event.target.files,
                file;
            if (files && files.length > 0) {
                file = files[0];
                try {
                    // Get window.URL object
                    var URL = window.URL || window.webkitURL;

                    // Create and revoke ObjectURL
                    var imgURL = URL.createObjectURL(file);

                    // Set img src to ObjectURL
                    showPicture.src = imgURL;

                    // Revoke ObjectURL
                    URL.revokeObjectURL(imgURL);
                    
                }
                catch (e) {
                    try {
                        var fileReader = new FileReader();
                        fileReader.onload = function (event) {
                            showPicture.src = event.target.result;        
                        };
                        fileReader.readAsDataURL(file);
                    }
                    catch (e) {
                        var error = document.querySelector("#error");
                        if (error) {
                            error.innerHTML = "FileReader not supported";
                        }
                    }
                }
            }
        };
    }
})();
