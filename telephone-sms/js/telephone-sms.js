// Telephony object
var tel = navigator.mozTelephony;

// Check if the phone is muted (read/write property)
console.log(tel.muted);

// Check if the speaker is enabled (read/write property)
console.log(tel.speakerEnabled);

// Place a call
var call = tel.dial("123456789");

// Events for that call
call.onstatechange = function (event) {
    /*
        Possible values for state:
        "dialing", "ringing", "busy", "connecting", "connected", 
        "disconnecting", "disconnected", "incoming"
    */
    console.log(event.state);
};

// Above options as direct events
call.onconnected = function () {
    // Call was connected
};

call.ondisconnected = function () {
    // Call was disconnected
};



// Receiving a call
tel.onincoming = function (event) {
    var incomingCall = event.call;

    // Get the number of the incoming call
    console.log(incomingCall.number);

    // Answer the call
    incomingCall.answer();
};

// Disconnect a call
call.hangUp();


// Iterating over calls, and taking action depending on their changed status
tel.oncallschanged = function (event) {
    tel.calls.forEach(function (call) {
        // Log the state of each call
        console.log(call.state); 
    });
};


// SMS object
var sms = navigator.mozSMS;

// Send a message
sms.send("123456789", "Hello world!");

// Receive a message
sms.onreceived = function (event) {
    // Read message
    console.log(event.message);
};
