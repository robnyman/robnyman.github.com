(function () {
    document.querySelector("#reload").onclick = function () {
        location.reload(true);
    };

    var deviceStorage = navigator.getDeviceStorage("videos");
    console.log("deviceStorage: " + deviceStorage);

    var lockScreen = screen.mozLockOrientation("landscape");
    console.log("lockScreen: " + lockScreen);

    var activity = new MozActivity({
        name: "view",
        data: {
            type: "image/png",
            url: ""
        }
     });
    console.log("MozActivity:" + activity); 

    try {
        var register = navigator.mozRegisterActivityHandler({
            name: "view",
            disposition: "inline",
            filters: {
                type: "image/png"
            }
         });
        console.log("mozRegisterActivityHandler " + register);
    }
    catch (e) {
        console.log(e);
    }

    try {
        var setHandler = navigator.mozSetMessageHandler("activity", function (a) { 
            var img = getImageObject(); 
            img.src = a.source.url; 
            // Call a.postResult() or a.postError() if
            // the activity shouldn return a value 
        });
        console.log("mozSetMessageHandler: " + setHandler);
    }
    catch (e) {
        console.log(e);
    }

    try {
        var alarmRequest = navigator.mozAlarms.add( 
            new Date("May 15, 2012 16:20:00"),
            "honorTimezone",
            {
                mydata: "my event"
            }
        );
        console.log("mozAlarms: " + alarmRequest);
    }
    catch (e) {
        console.log(e);
    }

    try {
        var archiveFile = new ArchiveReader();
        console.log("ArchiveReader: " + archiveFile);
    }
    catch (e) {
        console.log(e);
    }

    window.addEventListener("deviceproximity", function (event) {
        // Current device proximity, in centimeters 
        console.log(event.value); 
    });

    var connection = window.navigator.mozConnection, 
        online = connection.bandwidth > 0,
        metered = connection.metered; 
    console.log("mozConnection.online: " + online);

    var contact = new mozContact();
     contact.init({
        name: "Tom"}
    );
      var request = navigator.mozContacts.save(contact);
     request.onsuccess = function() {
        console.log("Contact success");
     };
      request.onerror = function() {
        console.log("Contact error")
     };

    var notification = navigator.mozNotification;
    console.log(notification.createNotification);

    notification.createNotification(
        "See this", 
        "This is a notification"
    );
})();
