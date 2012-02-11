(function () {
    var elm = document.getElementById("classlist-demo");
    elm.classList.add("boxy");
    elm.classList.add("pretty");
    elm.classList.remove("pretty");
    elm.classList.toggle("pretty");
    elm.innerHTML += "<br>Contains pretty: " + elm.classList.contains("pretty");
    elm.innerHTML += "<br>" + elm.classList.toString();


    var customAttributes = document.getElementById("custom-attributes"),
        attributes
        dataset = [];
    attributes = "<br>data-type: " + customAttributes.getAttribute("data-type");
    attributes += "<br>data-value: " + customAttributes.getAttribute("data-value");
    attributes += "<br>dataset: ";
    for (var i in customAttributes.dataset) {
        dataset.push(i + ": " + customAttributes.dataset[i]);
    }
    attributes += dataset.join(", ");
    customAttributes.innerHTML += attributes;
})();
