(function () {
    var liveVideo = document.querySelector("#live-video"),
        getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia,
        error = document.querySelector("#error");

    alert(getUserMedia);

    if (liveVideo && getUserMedia) {
        navigator.webkitGetUserMedia("video", 
            function (media) {
                alert(media);
                liveVideo.src = window.webkitURL.createObjectURL(media);
            },
            function (error) {
                error.innerHTML = "An error occurred: " + error;
            }
        );
    }
    else {
        error.innerHTML = "getUserMedia not supported";
    }
})();
