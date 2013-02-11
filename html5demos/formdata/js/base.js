(function () {
    // Getting a file through XMLHttpRequest as an arraybuffer and creating a Blob
    var rhino = document.querySelector("#rhino");
    if (rhino) {
        var xhr = new XMLHttpRequest(),
            blob;

        xhr.open("GET", "rhino.png", true);
        /*
            Set the responseType to "blob". 
            If it isn't supported in the targeted web browser, 
            use "arraybuffer" instead and wrap the response 
            with new Uint8Array() below
        */
        xhr.responseType = "blob";

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                /* 
                    Create a blob from the response
                    Only needed if the responseType isn't already blob
                    If it's "arraybuffer", do this:
    
                    blob = new Blob([new Uint8Array(xhr.response)], {type: "image/png"});
                */
                blob = xhr.response;
                var form = new FormData();
                form.append("blobbie", blob);
                 
                var xhrForm = new XMLHttpRequest();
                xhrForm.open("POST", "getfile.php");
                xhrForm.send(form);

                xhrForm.onreadystatechange = function () {
                    if (xhrForm.readyState === 4) {
                        console.log(xhrForm.response);
                        rhino.src = xhrForm.response;
                    }
                };
            }
        };
        // Send XHR
        xhr.send();
    }
})();
