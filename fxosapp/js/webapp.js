/*
    WebActivities:

    configure
    costcontrol/balance
    costcontrol/data_usage
    costcontrol/telephony
    dial
    new
    open
    pick
    save-bookmark
    share
    test
    view

*/

var pickImage = document.querySelector("#pick-image");
if (pickImage) { 
    pickImage.onclick = function () {
         // alert(MozActivity);
         var activity = new MozActivity({
             name: "pick",
             data: {
                 type: ["image/png", "image/jpg", "image/jpeg"]
                 // multiple: true
              }
         });

        activity.onsuccess = function () { 
            var img = document.createElement("img");
            img.src = window.URL.createObjectURL(this.result.blob);
            document.querySelector("#main").appendChild(img);
        };

         activity.onerror = function () { 
            alert("Can't view the image!");
        };
    }
}

var saveBookmark = document.querySelector("#save-bookmark");
if (saveBookmark) { 
    saveBookmark.onclick = function () {
        var activity = new MozActivity({
            name: "save-bookmark",
            data: {
                type: "url",
                url: "http://robertnyman.com"
             }
        });
    }
}

var dial = document.querySelector("#dial");
if (dial) { 
    dial.onclick = function () {
        var activity = new MozActivity({
            name: "dial",
            data: {
                type: "webtelephony/number",
                number: "+46777888999"
            }
        });
    }
}

var reload = document.querySelector("#reload");
if (reload) { 
    reload.onclick = function () {
        location.reload(true);
    };
}